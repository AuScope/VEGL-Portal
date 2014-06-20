include "vgl_common"
include "epel"
include "python_pip"
include "puppi"
include "autofsck"

$procplus = $physicalprocessorcount + 1

class generic-deps {
    package { ["fftw-devel", "fftw"]:
        ensure => installed,
        require => [Class["epel"], Class["mpi"], Class["vgl_common"] ]
    }
}


class mpi {
    # Note: At the time of writing the current OpenMPI package (openmpi-devel-1.5.4-1.el6.x86_64) is missing the necessary I/O component.
    # Parts of escript require the I/O functionality and will not work. A bug was filed with CentOS who will
    # hopefully fix the issue in an updated package (see http://bugs.centos.org/view.php?id=5931).
    # When that bug is fixed you should be able run yum install openmpi but until that time you will need to build from source:
    puppi::netinstall { "openmpi":
        url => "http://www.open-mpi.org/software/ompi/v1.6/downloads/openmpi-1.6.5.tar.gz",
        extracted_dir => "openmpi-1.6.5",
        destination_dir => "/tmp",
        postextract_command => "/tmp/openmpi-1.6.5/configure --prefix=/usr/local && make -j${::procplus} all && make all install",
        require => [Class["vgl_common"]],
    }

    $mpiShContent= '# Environment for MPI
export PATH=/usr/local/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/lib/openmpi:/usr/local/lib/:$LD_LIBRARY_PATH'
    file {"mpi-profile-env":
        path => "/etc/profile.d/mpi.sh",
        ensure => present,
        content => $mpiShContent,
        require => Puppi::Netinstall['openmpi'],
    }
}

class scientificpython {
    puppi::netinstall { "scientificpython-inst":
        url => "https://sourcesup.renater.fr/frs/download.php/4425/ScientificPython-2.9.3.tar.gz",
        extracted_dir => "ScientificPython-2.9.3",
        destination_dir => "/tmp",
        postextract_command => "python setup.py install",
        require => [ Class["generic-deps"], Package["netcdf-devel"], ],
    }
}

class pypar {
    puppi::netinstall { "pypar-inst":
        url => "https://pypar.googlecode.com/files/pypar-2.1.5_108.tgz",
        destination_dir => "/tmp",
        extracted_dir => "pypar_2.1.5_108/source",
        postextract_command => "/usr/bin/perl -pi -e 's#mpicc -show#/usr/local/bin/mpicc -show#g' /tmp/pypar_2.1.5_108/source/setup.py && /usr/bin/python /tmp/pypar_2.1.5_108/source/setup.py install",
        require => [Class["generic-deps"] ],
    }
}

class gdal {
	# Install cartographic projection library
	puppi::netinstall { "proj":
		url => "http://download.osgeo.org/proj/proj-4.8.0.tar.gz",
		extracted_dir => "proj-4.8.0",
		destination_dir => "/tmp",
		postextract_command => "/tmp/proj-4.8.0/configure && make -j${::procplus} && make install",
		require => Class["vgl_common"]],
	}

    puppi::netinstall { "gdal-inst":
        url => "http://download.osgeo.org/gdal/1.11.0/gdal-1.11.0.tar.gz",
        destination_dir => "/tmp",
        extracted_dir => "gdal-1.11.0",
        postextract_command => "/tmp/gdal-1.11.0/configure --with-python --with-netcdf && make -j${::procplus} && make install",
        require => [Class["generic-deps"], Package["proj"]],
    }
}



#Checkout, configure and install anuga with a 'dodgy SSL cert'
exec { "anuga-co":
    cwd => "/usr/local",
    command => "/bin/echo p | svn info https://anuga.anu.edu.au/svn/anuga/trunk/anuga_core/ && /usr/bin/svn export --trust-server-cert --non-interactive https://anuga.anu.edu.au/svn/anuga/trunk/anuga_core/ anuga",
    creates => "/usr/local/anuga",
    require => [Class["generic-deps"], Class["mpi"], Class["scientificpython"], Class["pypar"], Class["gdal"],],
    timeout => 0,
}

class {"generic-deps": }
class {"mpi": }
class {"pypar": }
class {"scientificpython": }
class {"gdal": }



#hack setup file to find mpicc
exec { "anuga-install":
    cwd => "/usr/local/anuga",
    command => "/usr/bin/perl -pi -e 's#mpicc -show#/usr/local/bin/mpicc -show#g' /usr/local/anuga/source/anuga_parallel/pypar_extras/setup.py && /usr/bin/python compile_all.py",
    require => Exec["anuga-co"],
    timeout => 0,
}

$anugaenvContent= '# Environment for ANUGA
export PYTHONPATH="$PYTHONPATH:/usr/local/anuga/source"
'

file {"anuga-profile-env":
	path => "/etc/profile.d/anuga.sh",
	ensure => present,
	require => Exec["anuga-install"],
	content => $anugaenvContent,
}