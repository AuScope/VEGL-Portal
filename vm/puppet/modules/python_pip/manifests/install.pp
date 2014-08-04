# Installs python dependencies in a requirements file
define python_pip::install ($requirements_file) {
  include python_pip

  exec { "Install requirements with pip":
    command => "/usr/bin/pip install -r ${requirements_file}",
    require => Class["python_pip"],
    timeout => 0,
  }
}
