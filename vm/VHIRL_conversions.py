#!/usr/bin/env python

import os
import sys
import osr
import re
import subprocess

# Capitalisation doesn't actually matter to ANUGA
att_map = {'units':'Units', 'ellps':'Datum', 'proj':'Projection',
           'zone':'Zone'}
att_order = ['Projection', 'Zone', 'Datum', 'Zunits', 'Units', 'Spheroid',
            'XShift',  'YShift']


def geotif2nc(file_in, file_out):
    """
    Convert the .geotif file to something THREDDS supports.
    """
    os.system("gdal_translate -of netCDF " +file_in+ " " +file_in+ ".nc")
    os.system("gdalwarp -t_srs EPSG:4326 -of netcdf " +file_in+ ".nc " +file_out)


def asc2nc(file_in, file_out):
    """
    Convert the .asc file to something THREDDS supports.
    """
    os.system("gdal_translate -of netCDF " +file_in+ " " +file_in+ ".nc")
    os.system("gdalwarp -t_srs EPSG:4326 -of netcdf " +file_in+ ".nc " +file_out)

def nc2asc(file_in, stem_out, s_srs='WGS84', zone=50):
    """
    Convert an nc back to a file format ANUGA can consume.

    stem_out -- The file name without the extension
    s_srs -- Source file SRS

    """
    # Attempt to determine the NODATA value from the source
    info = subprocess.Popen(["gdalinfo", file_in],
                            stdout=subprocess.PIPE).communicate()[0]
    nodata = re.findall("NoData Value=(-?\d+\.?\d*)", info)
    if nodata:
        nodata = " ".join([str(x) for x in nodata])
    else:
        # Default value
        nodata = "-9999"
    cmd = "gdalwarp -s_srs '" + s_srs + "' -t_srs '+proj=utm "
    cmd += "+zone=" + str(zone) + " +south +datum=GDA94' "
    cmd += '-of netcdf -dstnodata "' + nodata + '" '
    cmd += file_in +' ' + stem_out + '_UTM.nc'
    os.system(cmd)
    os.system("gdal_translate -of AAIGrid " +stem_out+ "_UTM.nc " +stem_out+ ".asc")
    convert_new_prj2old(stem_out + '.prj')


def convert_new_prj2old(prj_file):
    prj_text = open(prj_file, 'r').read()
    srs = osr.SpatialReference()
    if srs.ImportFromWkt(prj_text):
        raise ValueError("Error importing PRJ information from: %s" % prj_file)
    print srs.ExportToProj4()
    print srs.ExportToWkt()
    proj_st = srs.ExportToProj4()
    proj_sp = proj_st.split(' ')
    print proj_sp
    blunt = 'Anuga_ignores_but_needs'
    proj_dic = {'Zunits': blunt, 'Spheroid': blunt}
    # Should get this from the srs
    proj_dic['XShift'] = 500000
    if '+south' in proj_sp:
        proj_dic['YShift'] = 10000000
    else:
        proj_dic['YShift'] = 0
    for aline in proj_sp:
        if '=' in aline:
            parts = aline[1:].split('=')
            print parts
            proj_dic[att_map[parts[0]]] = parts[1]
    print proj_dic

    #Writing over the new sytle .prj
    #prj_file = 'old.prj'
    f = open(prj_file, 'w')
    for att in att_order:
        a_str = att + ' ' + str(proj_dic[att]) + '\n'
        f.write(a_str)
    f.close()

if __name__=="__main__":
    #main(sys.argv[1])
    main("small_trip.prj")
