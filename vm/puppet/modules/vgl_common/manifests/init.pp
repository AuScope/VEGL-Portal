# Installs common VGL dependencies for Centos
# Depends on the stahnma/epel module and python_pip module

class vgl_common {

    # Install default packages
    package { ["wget", "subversion", "netcdf-devel", "mercurial", "ftp", "bzip2", "bzip2-devel", "elfutils", "ntp", "ntpdate", "gcc", "gcc-c++", "gcc-gfortran", "compat-gcc-34-g77", "make", "openssh", "openssh-clients", "swig", "libpng-devel", "freetype-devel", "atlas", "atlas-devel", "libffi-devel", "mlocate"]:
        ensure => installed,
        require => Class["epel"],
    }

	#upgrade pip and setuptools
    package { [	"setuptools", "pip", "distribute"]:
        ensure => latest,
        provider => "pip",
        require => Class["python_pip"],
    }

	# I want the new one....
    package { ["ca-certificates" ]:
		ensure => latest,
		require => Class["epel"],
    }

    # Install default pip packages
    package {  ["boto", "pyproj", "python-swiftclient", "python-keystoneclient"]:
        ensure => installed,
        provider => "pip",
        require => Class["python_pip"],
    }
	
	package { ["numpy", "unittest2",]:
	    ensure => latest,
        provider => "pip",
        require => [Class["python_pip"], Package["setuptools"] ],
	}

    package { ["scipy"]:
        ensure => latest,
        provider => "pip",
        require => [Class["python_pip"], Package["numpy"]],
    }

    package { ["matplotlib"]:
        ensure => latest,
        provider => "pip",
        require => [Class["python_pip"], Package["numpy"]],
    }


    # Install startup bootstrap
    $curl_cmd = "/usr/bin/curl"
    $bootstrapLocation = "/etc/rc.d/rc.local"
    exec { "get-bootstrap":
        before => File[$bootstrapLocation],
        command => "$curl_cmd -L https://svn.auscope.org/subversion/AuScopePortal/VEGL-Portal/branches/VHIRL-Portal/vm/ec2-run-user-data.sh > $bootstrapLocation",
    }
    file { $bootstrapLocation:
        ensure => present,
        mode => "a=rwx",
    }
}


