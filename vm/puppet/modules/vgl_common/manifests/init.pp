# Installs common VGL dependencies for Centos
# Depends on the stahnma/epel module and python_pip module

class vgl_common {

    # Install default packages
    # tk-devel and tkinter are required for matplotlib
  package { ["wget", "subversion", "netcdf-devel", "mercurial", "ftp", "bzip2", "bzip2-devel", "elfutils", "ntp", "ntpdate", "gcc", "gcc-c++", "gcc-gfortran", "compat-gcc-34-g77", "make", "openssh", "openssh-clients", "swig", "libpng-devel", "freetype-devel", "atlas", "atlas-devel", "libffi-devel", "mlocate", "tk-devel", "tkinter", "libxml2-devel", "libxslt-devel"]:
        ensure => installed,
        require => Class["epel"],
    }

	#upgrade pip and setuptools
    package { [	"setuptools", "distribute", ]:
        ensure => latest,
        provider => "pip",
        require => Class["python_pip"],
    }

    package { [	"pip", ]:
        ensure => latest,
        provider => "pip",
        require => [ Class["python_pip"], Package["distribute"], Package["setuptools"], ],
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
        require => [Class["python_pip"], Package["setuptools"], Package["distribute"], Package["setuptools"], Package["pip"], Package["libxml2-devel"], Package["libxslt-devel"]],
    }

    # New/latest packages are needed here.
	package { ["numpy", "unittest2",]:
	    ensure => latest,
        provider => "pip",
        require => [Class["python_pip"], Package["setuptools"], Package["distribute"], Package["setuptools"], Package["pip"], ],
	}

    package { ["scipy"]:
        ensure => latest,
        provider => "pip",
        require => [Class["python_pip"], Package["numpy"]],
    }

    package { ["matplotlib"]:
        ensure => latest,
        provider => "pip",
        require => [Class["python_pip"], Package["numpy"], Package["scipy"], Package["tk-devel"], Package["tkinter"]],
    }


    # Install startup bootstrap
    $curl_cmd = "/usr/bin/curl"
    $bootstrapLocation = "/etc/rc.d/rc.local"
    exec { "get-bootstrap":
        before => File[$bootstrapLocation],
        command => "$curl_cmd -L https://github.com/AuScope/VHIRL-Portal/raw/master/vm/ec2-run-user-data.sh > $bootstrapLocation",
    }
    file { $bootstrapLocation:
        ensure => present,
        mode => "a=rwx",
    }
}
