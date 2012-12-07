package org.auscope.portal.server.web.service;

import org.auscope.portal.core.cloud.CloudJob;
import org.auscope.portal.core.services.cloud.JobMonitoringService;
import org.auscope.portal.core.services.cloud.monitor.JobMonitorListener;
import org.auscope.portal.server.web.controllers.JobBuilderController;
import org.springframework.stereotype.Service;

/**
 * A service class for managing state changes in VGL jobs and alerting users
 * @author Josh Vote
 *
 */
@Service
public class VglJobStateHandler implements JobMonitorListener {

    /** The job monitoring service that this class will subscribe to*/
    private JobMonitoringService jobMonitorService;



    public VglJobStateHandler(JobMonitoringService jobMonitorService) {
        super();
        this.jobMonitorService = jobMonitorService;
        this.jobMonitorService.addEventListener(this);
        this.jobMonitorService.startMonitoring();
    }



    @Override
    public void handleStatusChanged(CloudJob job, String newStatus,
            String oldStatus) {


        if (JobBuilderController.STATUS_DONE.equals(newStatus)) {

        }
    }

}
