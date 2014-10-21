include "epel"
include "vgl_common"
include "python_pip"
include "puppi"
include "autofsck"

$sc_path = "${sc_path}"

class "sys_deps" {
  #foreach( $package in $system_packages )
  package { "${package}":
    ensure => installed,
    require => Class["epel"]
  }
  #end
}

include sys_deps

class py_deps {
  #foreach( $package in $python_packages )
  package { "${package}":
    ensure => latest,
    provider => "pip",
    require => [Class["python_pip"], Class["sys_deps"]]
  }
  #end
}

include py_deps

class ${sc_name}_deps {
  # Always include pypar
  include centos65_pypar

  # Check out source
  #if( $source.type == "git" )
  exec { "source_checkout":
    command => "/usr/bin/git clone -b ${source.checkout} ${source.url} ${sc_path}",
    creates => "${sc_path}",
    require => [Package["git"]],
    timeout => 0
  }
  #elseif ( $source.type == "svn" )
  not implemented yet
  #else
  blah blah blah
  #end

  # Install dependencies
  # Python requirements.txt
  #if( $python_requirements )
  python_pip::install { "python requirements":
    requirements_file => "${sc_path}/${python_requirements}",
    require => [Class["python_pip"], Exec["source_checkout"], Class["py_deps"]]
  }
  #end

  # Execute setup if any
  exec { "setup":
    cwd => "${sc_path}",
    command => "/usr/bin/sh -c '${source.exec}'",
    require => [Exec["source_checkout"],
                Python_pip::Install["python requirements"]],
    timeout => 0
  }
}

include ${sc_name}_deps
