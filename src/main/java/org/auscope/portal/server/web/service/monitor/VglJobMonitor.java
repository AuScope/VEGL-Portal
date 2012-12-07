package org.auscope.portal.server.web.service.monitor;

import org.auscope.portal.core.cloud.CloudFileInformation;
import org.auscope.portal.core.cloud.CloudJob;
import org.auscope.portal.core.services.cloud.CloudComputeService;
import org.auscope.portal.core.services.cloud.CloudStorageService;
import org.auscope.portal.core.services.cloud.monitor.JobMonitor;
import org.auscope.portal.server.vegl.VEGLJob;
import org.auscope.portal.server.vegl.VEGLJobManager;
import org.auscope.portal.server.web.controllers.BaseCloudController;
import org.auscope.portal.server.web.controllers.JobBuilderController;
import org.auscope.portal.server.web.controllers.JobListController;

/**
 * A JobMonitor implementation that takes into account the VGL job object model
 * @author Josh Vote
 *
 */
public class VglJobMonitor extends BaseCloudController implements JobMonitor {

    private VEGLJobManager jobManager;

    /**
     * Creates a new Monitor with access to the specified storage/compute services
     * @param cloudStorageServices
     * @param cloudComputeServices
     */
    public VglJobMonitor(VEGLJobManager jobManager, CloudStorageService[] cloudStorageServices,
            CloudComputeService[] cloudComputeServices) {
        super(cloudStorageServices, cloudComputeServices);
        this.jobManager = jobManager;
    }

    private boolean containsFile(CloudFileInformation[] files, String fileName) {
        if (files == null) {
            return false;
        }

        for (CloudFileInformation file : files) {
            if (file.getName().endsWith(fileName) && file.getSize() > 0) {
                return true;
            }
        }

        return false;
    }


    /**
     * Using the services internal to the class, determine the current status of this job. Service failure
     * will return the underlying job status
     */
    @Override
    public String getJobStatus(CloudJob cloudJob) {
        //The service hangs onto the underlying job Object but the DB is the point of truth
        //Make sure we get an updated job object first!
        VEGLJob job = jobManager.getJobById(cloudJob.getId());
        if (job == null) {
            return null;
        }

        //If the job is currently in the done state - do absolutely nothing.
        if (JobBuilderController.STATUS_DONE.equals(job.getStatus())) {
            return JobBuilderController.STATUS_DONE;
        }

        //Have we even started a VM yet?
        if (job.getComputeInstanceId() == null || job.getComputeInstanceId().isEmpty()) {
            return JobBuilderController.STATUS_UNSUBMITTED;
        }

        //Get the output files for this job
        CloudStorageService cloudStorageService = getStorageService(job);
        if (cloudStorageService == null) {
            log.error(String.format("No cloud storage service with id '%1$s' for job '%2$s'. cannot update job status", job.getStorageServiceId(), job.getId()));
            return job.getStatus();
        }
        CloudFileInformation[] results = null;
        try {
            results = cloudStorageService.listJobFiles(job);
        } catch (Exception e) {
            log.warn("Unable to list output job files", e);
            return job.getStatus();
        }

        boolean jobStarted = containsFile(results, "workflow-version.txt");
        boolean jobFinished = containsFile(results, JobListController.VGL_LOG_FILE);
        if (jobFinished) {
            return JobBuilderController.STATUS_DONE;
        } else if (jobStarted) {
            return JobBuilderController.STATUS_ACTIVE;
        } else {
            return JobBuilderController.STATUS_PENDING;
        }
    }

}
