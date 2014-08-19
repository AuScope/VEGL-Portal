# Installs an up-to-date mpi and pypar setup.
class centos65_pypar {
  include epel
  include puppi
  include vgl_common

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

  puppi::netinstall { "pypar-inst":
    url => "https://pypar.googlecode.com/files/pypar-2.1.5_108.tgz",
    destination_dir => "/tmp",
    extracted_dir => "pypar_2.1.5_108/source",
    postextract_command => "/usr/bin/perl -pi -e 's#mpicc#/usr/local/bin/mpicc#g' /tmp/pypar_2.1.5_108/source/setup.py && /usr/bin/python /tmp/pypar_2.1.5_108/source/setup.py install",
    require => [Class["epel", "vgl_common"], File["mpi-profile-env"]],
  }
}
