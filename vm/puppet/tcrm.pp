include "vgl_common"
include "epel"
include "python_pip"
include "puppi"
include "autofsck"

class tcrmdeps {
  package { ["geos-devel", "git", "hdf5-devel", "libxml2-devel", "libxslt-devel", "tk-devel"]:
    ensure => installed,
    require => [Class["epel"], Class["vgl_common"]]
  }
}

# Explicitly allow externals so we can get basemap
# TODO: Find out how to pass parameters to the 'pip' provider
exec { "basemap_install":
  command => "/usr/bin/pip install --allow-all-external --allow-unverified basemap basemap",
  require => [Class["epel"], Class["python_pip"], Class["vgl_common"], Class["tcrmdeps"]],
  timeout => 0,
}

# package { ["basemap"]:
#   ensure => latest,
#   provider => "pip",
#   require => [Class["epel"], Class["python_pip"], Class["vgl_common"], Class["tcrmdeps"]],
# }

package { ["netCDF4"]:
  ensure => latest,
  provider => "pip",
  require => [Class["epel"], Class["python_pip"], Class["vgl_common"], Class["tcrmdeps"]],
}

#Checkout, configure and install tcrm
exec { "tcrm-co":
  cwd => "/usr/local",
  command => "/usr/bin/git clone https://github.com/GeoscienceAustralia/tcrm.git",
  creates => "/usr/local/tcrm",
  require => [Class["tcrmdeps"], Exec["basemap_install"], Package["netCDF4"]],
  timeout => 0,
}

class {"tcrmdeps": }

exec { "tcrm-setup":
  cwd => "/usr/local/tcrm",
  command => "/usr/bin/python installer/setup.py build_ext -i",
  require => [Exec["tcrm-co"]],
  timeout => 0,
}
