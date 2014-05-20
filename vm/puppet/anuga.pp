import "vgl_common"
import "epel"
import "python_pip"
import "puppi"
import "autofsck"

class {["epel", "python_pip", "vgl_common"]:}

# Disable fsck on boot
class { autofsck:
  ensure => present, # default
}


class scientificpython {
	package { ["netcdf-devel"]:
		ensure => installed,
		require => Class["epel"],
	}
	
    puppi::netinstall { 'scientificpython-inst':
        url => 'https://sourcesup.renater.fr/frs/download.php/4425/ScientificPython-2.9.3.tar.gz',
		postextract_command => 'sh ./build_visit2_7_2',
        require => Puppi::Netinstall["visit"],
    }

#Install aem specific packages...
class aem_packages {
    package { ["fftw-devel", "fftw", "openmpi", "openmpi-devel"]: 
        ensure => installed,
        require => Class["epel"],
    }
}


class {"aem_packages": }



# Todo : Install ga-aem code (awaiting GA paper work to be done to make the code public)

