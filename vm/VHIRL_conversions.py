#!/usr/bin/env python

import os
import sys
import osr

# Capitalisation doesn't actually matter to ANUGA
att_map = {'units':'Units', 'ellps':'Datum', 'proj':'Projection',
           'zone':'Zone'}
att_order = ['Projection', 'Zone', 'Datum', 'Zunits', 'Units', 'Spheroid',
            'XShift',  'YShift']

def asc2nc(file_in, file_out):
    """
    Convert the .asc file to something THREDDS supports.
    """
    mid_file = file_in+ ".nc"
    try:
        os.remove(mid_file)
    except OSError:
        pass
    try:
        os.remove(file_out)
    except OSError:
        pass
    os.system("gdal_translate -a_nodata none -of netCDF " + file_in + " " + mid_file)
    os.system("gdalwarp -t_srs EPSG:4326 -srcnodata -9999 -dstnodata -9999 -of netcdf " +mid_file+ " " +file_out)
    os.system("ncdump " + file_in+'.nc ' + '> ' + file_in+'_nc.txt') # small.asc_nc.txt
    os.system("ncdump " + file_out + '> ' + file_out+'_nc.txt') # small.nc_n

def nc2asc(file_in, stem_out):
    """
    Convert an nc back to a file format ANUGA can consume.

    stem_out - The file name without the extension.
    """
    # Check in python if the file is present.
    a_handle = open(file_in, 'r')
    a_handle.close()

    mid_file = stem_out+ "_UTM.nc"
    try:
        os.remove(mid_file)
    except IOError:
            pass
    os.system("gdalwarp -t_srs '+proj=utm +zone=50 +south +datum=GDA94' -of netcdf " + file_in + ' ' + mid_file)
    os.system("gdal_translate  -a_nodata -9999 -of AAIGrid " + mid_file + " " +stem_out+ ".asc")
    convert_new_prj2old(stem_out + '.prj')


def asc2other(file_in, file_out):
    """
    Convert the .asc file to something THREDDS supports.
    """
    mid_file = file_in+ ".nc"
    try:
        os.remove(mid_file)
    except OSError:
        pass
    try:
        os.remove(file_out)
    except OSError:
        pass
    os.system("gdal_translate -of GeoJSON " + file_in + " " + mid_file)
    #os.system("gdalwarp -t_srs EPSG:4326 -srcnodata -9999 -dstnodata -9999 -of netcdf " +mid_file+ " " +file_out)
   # os.system("ncdump " + file_in+'.nc ' + '> ' + file_in+'_nc.txt') # small.asc_nc.txt
    #os.system("ncdump " + file_out + '> ' + file_out+'_nc.txt') # small.nc_n

def nc2asc(file_in, stem_out):
    """
    Convert an nc back to a file format ANUGA can consume.

    stem_out - The file name without the extension.
    """
    # Check in python if the file is present.
    a_handle = open(file_in, 'r')
    a_handle.close()

    mid_file = stem_out+ "_UTM.nc"
    try:
        os.remove(mid_file)
    except IOError:
            pass
    os.system("gdalwarp -t_srs '+proj=utm +zone=50 +south +datum=GDA94' -of netcdf " + file_in + ' ' + mid_file)
    os.system("gdal_translate  -a_nodata -9999 -of AAIGrid " + mid_file + " " +stem_out+ ".asc")
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
