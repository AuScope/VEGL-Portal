include "epel"
include "vgl_common"
include "python_pip"
include "puppi"
include "autofsck"

$tcrm_path = "/opt/tcrm"

class tcrmdeps {
  include centos65_pypar

  package { ["geos-devel", "git", "hdf5-devel"]:
    ensure => installed,
    require => [Class["epel"], Class["vgl_common"]]
  }

  # Clone tcrm code locally
  exec { "tcrm-co":
    command => "/usr/bin/git clone -b py26 https://github.com/squireg/tcrm.git ${tcrm_path}",
    # command => "/usr/bin/git clone https://github.com/GeoscienceAustralia/tcrm.git ${tcrm_path}",
    creates => "${tcrm_path}",
    require => [Package["git"], Class["centos65_pypar"]],
    timeout => 0,
  }

  # Install the python dependencies
  python_pip::install { "Install deps from tcrm/requirements.txt":
    requirements_file => "${tcrm_path}/requirements.txt",
    require => [Package["geos-devel", "hdf5-devel"], Exec["tcrm-co"]],
    alias => "tcrm_pip",
  }

  # Basemap is listed on pypi but hosted externaly, so we need to call
  # pip with allow-external/allow-unverified to grab it.
  # TODO: Find out how to pass parameters to the 'pip' provider
  exec { "basemap_install":
      command => "/usr/bin/pip install --allow-external basemap --allow-unverified basemap basemap",
      require => Python_pip::Install["tcrm_pip"],
      timeout => 0,
    }
}

include tcrmdeps

# Setup tcrm
exec { "Set up TCRM in ${tcrm_path}":
  cwd => "${tcrm_path}",
  command => "/usr/bin/python installer/setup.py build_ext -i",
  require => Class["tcrmdeps"],
  timeout => 0,
}
