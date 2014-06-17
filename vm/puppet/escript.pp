include "vgl_common"
include "epel"
include "python_pip"
include "puppi"
include "autofsck"

$procplus = $physicalprocessorcount + 1


#Install escript specific packages...
class escript_packages {
    package { ["blas-devel", "gdal-python", "cppunit-devel", "scons", "suitesparse-devel", "python-matplotlib", ]:
        ensure => installed,
        require => Class["epel"],
    }
}

class {"escript_packages": }

class escript_deps {
	# Install cartographic projection library
	puppi::netinstall { "proj":
		url => "http://download.osgeo.org/proj/proj-4.8.0.tar.gz",
		extracted_dir => "proj-4.8.0",
		destination_dir => "/tmp",
		postextract_command => "/tmp/proj-4.8.0/configure && make -j${::procplus} && make install",
		require => [Class["escript_packages"], Class["vgl_common"]],
	}

	# Install gmsh
	puppi::netinstall { "gmsh":
		url => "http://geuz.org/gmsh/bin/Linux/gmsh-2.8.4-Linux64.tgz",
		extracted_dir => "gmsh-2.8.4-Linux",
		destination_dir => "/tmp",
		postextract_command => "mv /tmp/gmsh-2.8.4-Linux/bin/gmsh /usr/local/bin/",
		require => [Class["escript_packages"], Class["vgl_common"]],
	}

	# Install SILO
	puppi::netinstall { "silo":
		url => "https://wci.llnl.gov/codes/silo/silo-4.8/silo-4.8-bsd.tar.gz",
		extracted_dir => "silo-4.8-bsd",
		destination_dir => "/tmp",
		postextract_command => "/tmp/silo-4.8-bsd/configure --prefix=/usr/local && make -j${::procplus} && make install",
		require => [Class["escript_packages"], Package["gcc-gfortran"], Class["vgl_common"]],
	}

	# Install SymPy
	puppi::netinstall { "sympy":
		url => "https://github.com/sympy/sympy/releases/download/sympy-0.7.5/sympy-0.7.5.tar.gz",
		extracted_dir => "sympy-0.7.5",
		destination_dir => "/tmp",
		postextract_command => "python /tmp/sympy-0.7.5/setup.py install",
		require => [Class["escript_packages"], Class["vgl_common"]],
	}

	# Install boost
	puppi::netinstall { "boost":
		url => "http://downloads.sourceforge.net/boost/boost_1_55_0.tar.gz",
		extracted_dir => "boost_1_55_0",
		destination_dir => "/tmp",
		postextract_command => "chmod a+x bootstrap.sh && ./bootstrap.sh",
		require => [Class["escript_packages"], Class["vgl_common"]],
	}

	#bootstrap captures args somehow and has a sad.... seperate make process here.
	exec { "boost-install":
		cwd => "/tmp/boost_1_55_0",
		command => "/tmp/boost_1_55_0/b2 -j ${::procplus} install threading=multi link=shared",
		require => Puppi::Netinstall["boost"],
	}
}

class {"escript_deps": }



# Install VisIt
class {"visit": }

# Note: At the time of writing the current OpenMPI package (openmpi-devel-1.5.4-1.el6.x86_64) is missing the necessary I/O component.
# Parts of escript require the I/O functionality and will not work. A bug was filed with CentOS who will
# hopefully fix the issue in an updated package (see http://bugs.centos.org/view.php?id=5931).
# When that bug is fixed you should be able run yum install openmpi but until that time you will need to build from source:
puppi::netinstall { "openmpi":
    url => "http://www.open-mpi.org/software/ompi/v1.6/downloads/openmpi-1.6.5.tar.gz",
    extracted_dir => "openmpi-1.6.5",
    destination_dir => "/tmp",
    postextract_command => "/tmp/openmpi-1.6.5/configure --prefix=/usr/local && make -j${::procplus} all && make all install",
    require => [Class["escript_packages"], Class["vgl_common"]],
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



#Checkout, configure and install escript
exec { "escript-co":
    cwd => "/tmp",
    command => "/usr/bin/svn co https://svn.geocomp.uq.edu.au/svn/esys13/tags/3.4.2.1 escript-3.4.2",
    creates => "/tmp/escript-3.4.2",
    require => [Class["escript_deps"],Class["escript_packages"], Class["vgl_common"]],
    timeout => 0,
}
# Copy vm_options.py to <hostname>_options.py AND set the mpi prefix to correct values
exec { "escript-config":
    cwd => "/tmp/escript-3.4.2/scons",
    command => "/bin/sed -e \"s/^mpi_prefix.*$/mpi_prefix = ['\\/usr\\/local\\/include', '\\/usr\\/local\\/lib']/g\" -e \"s/#boost_prefix.*$/boost_prefix = ['\\/usr\\/local\\/include', '\\/usr\\/local\\/lib']/g\"  -e \"s/#werror/werror/g\"  -e \"s/boost_libs.*$/boost_libs = ['boost_python']/g\" vm_options.py > `/bin/hostname | /bin/sed s/[^a-zA-Z0-9]/_/g`_options.py",
    require => Exec["escript-co"],
}
exec { "escript-install":
    cwd => "/tmp/escript-3.4.2",
    command => "/usr/bin/scons -j${::procplus}",
    require => Exec["escript-config"],
    timeout => 0,
}
$escriptShContent= '# Environment for escript
export PATH=/opt/escript/bin:$PATH
# where is boost - why it is here....
export LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH
'
file {"escript-profile-env":
    path => "/etc/profile.d/escript.sh",
    ensure => present,
    content => $escriptShContent,
    require => Exec['escript-install'],
}

