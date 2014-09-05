import glob
import os
import subprocess
import tempfile
import zipfile

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
gridLimit={'xMin':${west-bound-lon},'xMax':${east-bound-lon},'yMin':${south-bound-lat},'yMax':${north-bound-lat}}
gridSpace={'x':1.0,'y':1.0}
gridInc={'x':1.0,'y':0.5}
LocalityID=${locality-id}
LocalityName=${locality-name}

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
;TrackPath=./output/vl/tracks
Margin=2.0
Resolution=${windfield-interface-resolution}
;Resolution=0.05
Source=TCRM
profileType=powell
windFieldType=kepert

[Hazard]
; Years to calculate return period wind speeds
;InputPath=./output/vl/windfield
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
Path=./output/vl

[Logging]
LogFile=./output/vl/log/tcrm.log
LogLevel=INFO
Verbose=False

[Process]
ExcludePastProcessed=True
DatFile=./output/vl/process/dat/tcrm.dat

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
ini_file = tempfile.NamedTemporaryFile(mode='w',
                                       suffix=".ini",
                                       prefix="vhirl-tcrm",
                                       delete=False)
with ini_file as f:
    f.write(iniString)

# Execute TCRM job
print "Executing TCRM in {0}".format(TCRM_DIR)
os.chdir(TCRM_DIR)
subprocess.call(["mpirun", "-np", "${n-threads}", "/usr/bin/python", "tcrm.py", "-c", ini_file.name])


# Upload results
def upload_results(spec, keyfn=None):
    """Upload files specified by spec.

    Spec will be passed to glob.glob to find files.  If keyfn is
    supplied it should be a function that takes a filename from glob
    and returns the corresponding cloud key to use.

    """
    files = glob.glob(spec)
    for f in files:
        k = None
        if keyfn:
            k = keyfn(f)
        if k is None:
            k = f
        cloudUpload(f, k)


# Zip then upload results
def zip_upload_results(spec, name, key=None):
    """Zip files globbed from spec into zipfile name and upload under key.

    If key is None it will default to <name>.zip.

    """
    z = zipfile.ZipFile(name, 'w')
    for f in glob.glob(spec):
        z.write(f)
    z.close()
    cloudUpload(name, name if key is None else key)


# Logs
upload_results("output/vl/log/*")
# Track files
zip_upload_results("output/vl/tracks/*.csv", "tracks.zip")
# Windfield files
zip_upload_results("output/vl/windfield/*.nc", "windfields.zip")
# Hazard data and plots
upload_results("output/vl/plots/hazard/*.png")
upload_results("output/vl/hazard/*.nc")
