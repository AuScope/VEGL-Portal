import glob
import subprocess
import tempfile

TCRM_DIR="/opt/tcrm"

iniString = """
[Actions]
; TCRM modules to execute
DataProcess=True
ExecuteStat=True
ExecuteTrackGenerator=True
ExecuteWindfield=True
ExecuteHazard=True
PlotHazard=True
PlotData=False
ExecuteEvaluate=False
DownloadData=True

[DataProcess]
InputFile=Allstorms.ibtracs_wmo.v03r05.csv
Source=IBTRACS
StartSeason=1981
FilterSeasons=True

[Region]
; Domain for windfield and hazard calculation
gridLimit={'xMin':113.0,'xMax':124.0,'yMin':-26.0,'yMax':-15.0}
gridSpace={'x':1.0,'y':1.0}
gridInc={'x':1.0,'y':0.5}
LocalityID=250913860
LocalityName=Port Hedland, Western Australia, Australia.

[StatInterface]
kdeType=Biweight
kde2DType=Gaussian
kdeStep=0.2

[TrackGenerator]
; NumSimulations=1000
NumSimulations=${num-simulations}
; YearsPerSimulation=1
YearsPerSimulation=${years-per-simulation}
SeasonSeed=${season-seed}
TrackSeed=${track-seed}
;SeasonSeed=403943
;TrackSeed=89333

[WindfieldInterface]
;TrackPath=./output/port_hedland/tracks
Margin=2.0
Resolution=${windfield-interface-resolution}
;Resolution=0.05
Source=TCRM
profileType=powell
windFieldType=kepert

[Hazard]
; Years to calculate return period wind speeds
;InputPath=./output/port_hedland/windfield
;Resolution=0.05
Years=5,10,20,25,50,100,200,250,500,1000,2000,2500
MinimumRecords=10
CalculateCI=False


[Input]
landmask = input/landmask.nc
mslpfile = MSLP/slp.day.ltm.nc
datasets = IBTRACS,LTMSLP
MSLPGrid=1,2,3,4,12

[Output]
Path=./output/port_hedland

[Logging]
LogFile=./output/port_hedland/log/port_hedland.log
LogLevel=INFO
Verbose=False

[Process]
ExcludePastProcessed=True
DatFile=./output/port_hedland/process/dat/port_hedland.dat

[RMW]
GetRMWDistFromInputData=False
mean=50.0
sigma=0.6

[TCRM]
; Output track files settings
Columns=index,age,lon,lat,speed,bearing,pressure,penv,rmax
FieldDelimiter=,
NumberOfHeadingLines=1
SpeedUnits=kph
PressureUnits=hPa

[IBTRACS]
; Input data file settings
url = ftp://eclipse.ncdc.noaa.gov/pub/ibtracs/v03r05/wmo/csv/Allstorms.ibtracs_wmo.v03r05.csv.gz
path = input
filename = Allstorms.ibtracs_wmo.v03r05.csv
columns = tcserialno,season,num,skip,skip,skip,date,skip,lat,lon,skip,pressure
fielddelimiter = ,
numberofheadinglines = 3
pressureunits = hPa
lengthunits = km
dateformat = %Y-%m-%d %H:%M:%S
speedunits = kph

[LTMSLP]
; MSLP climatology file settings
URL = ftp://ftp.cdc.noaa.gov/Datasets/ncep.reanalysis.derived/surface/slp.day.1981-2010.ltm.nc
path = MSLP
filename = slp.day.ltm.nc
"""

def cloudUpload(inFilePath, cloudKey):
    """Upload inFilePath to cloud bucket with key cloudKey."""
    cloudBucket = os.environ["STORAGE_BUCKET"]
    cloudDir = os.environ["STORAGE_BASE_KEY_PATH"]
    queryPath = (cloudBucket + "/" + cloudDir + "/" + cloudKey).replace("//", "/")
    retcode = subprocess.call(["cloud", "upload", cloudKey, inFilePath, "--set-acl=public-read"])
    print ("cloudUpload: " + inFilePath + " to " + queryPath + " returned " + str(retcode))

def cloudDownload(cloudKey, outFilePath):
    """Downloads the specified key from bucket and writes it to outfile."""
    cloudBucket = os.environ["STORAGE_BUCKET"]
    cloudDir = os.environ["STORAGE_BASE_KEY_PATH"]
    queryPath = (cloudBucket + "/" + cloudDir + "/" + cloudKey).replace("//", "/")
    retcode = subprocess.call(["cloud", "download",cloudBucket,cloudDir,cloudKey, outFilePath])
    print "cloudDownload: " + queryPath + " to " + outFilePath + " returned " + str(retcode)

# Write the config file
fh, fname = tempfile.mkstemp(suffix=".ini", prefix="vhirl-tcrm")
fh.close()
with open(fname, 'w') as f:
    f.write(iniString)

# Execute TCRM job
print "Executing TCRM in {}".format(TCRM_DIR)
os.chdir(TCRM_DIR)
subprocess.call(["/usr/bin/python", "tcrm.py", "-c", fname])

# Upload results
hazard_plots = glob.glob("output/port_hedland/plots/hazard/*.png")
print "Found hazard plots: {}".format(hazard_plots)
for p in hazard_plots:
    cloudUpload(p, p)
