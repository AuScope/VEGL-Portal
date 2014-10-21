package org.auscope.portal.server.web.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.velocity.app.VelocityEngine;
import org.auscope.portal.server.vegl.VLScmSnapshot;
import org.auscope.portal.server.vegl.VLScmSnapshotDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.velocity.VelocityEngineUtils;

/**
 * A service for handling Scientific Code Marketplace templates.
 *
 * @author Geoff Squire
 *
 */
@Service
public class SCMEntryService {
    private final Log logger = LogFactory.getLog(getClass());

    /** Puppet module template resource */
    protected static final String PUPPET_TEMPLATE =
        "org/auscope/portal/server/web/service/template.pp";

    private VLScmSnapshotDao vlScmSnapshotDao;
    private VelocityEngine velocityEngine;

    /**
     * Create a new instance.
     */
    @Autowired
    public SCMEntryService(VLScmSnapshotDao vlScmSnapshotDao,
                           VelocityEngine velocityEngine) {
        super();
        this.vlScmSnapshotDao = vlScmSnapshotDao;
        this.setVelocityEngine(velocityEngine);
    }

    /**
     * Return id of the VM for entry at computeServiceId, or null if not found.
     *
     * @param entryId SCM template entry ID
     * @param computeServiceId ID of the CloudComputeService provider
     * @return Snapshot id if one exists, otherwise null
     */
    public String getTemplateSnapshotId(String entryId,
                                        String computeServiceId) {
        String vmId = null;
        VLScmSnapshot snapshot = vlScmSnapshotDao
            .getSnapshotForEntryAndProvider(entryId, computeServiceId);
        if (snapshot != null) {
            vmId = snapshot.getComputeVmId();
        }
        return vmId;
    }

    /**
     * Return the puppet module for SCM template entry.
     *
     * Generates a puppet module that will provision a VM suitable for
     * running a job using the SCM entry.
     *
     * @param entry The SCM template contents
     * @return String contents of the puppet module
     */
    public String getPuppetModule(Map<String, Object> entry) {
        return VelocityEngineUtils.mergeTemplateIntoString(velocityEngine,
                                                           PUPPET_TEMPLATE,
                                                           "UTF-8",
                                                           entry);
    }

    /**
     * @return the vlScmSnapshotDao
     */
    public VLScmSnapshotDao getVlScmSnapshotDao() {
        return vlScmSnapshotDao;
    }

    /**
     * @param vlScmSnapshotDao the vlScmSnapshotDao to set
     */
    public void setVlScmSnapshotDao(VLScmSnapshotDao vlScmSnapshotDao) {
        this.vlScmSnapshotDao = vlScmSnapshotDao;
    }

    /**
     * @return the velocityEngine
     */
    public VelocityEngine getVelocityEngine() {
        return velocityEngine;
    }

    /**
     * @param velocityEngine the velocityEngine to set
     */
    public void setVelocityEngine(VelocityEngine velocityEngine) {
        this.velocityEngine = velocityEngine;
    }

    private String loadPuppetTemplate() {
        String template = null;
        InputStream in = getClass()
            .getClassLoader().getResourceAsStream(PUPPET_TEMPLATE);
        if (in != null) {
            StringWriter w = new StringWriter();
            BufferedReader r = new BufferedReader(new InputStreamReader(in));
            try {
                String l = r.readLine();
                while (l != null) {
                    w.write(l);
                    l = r.readLine();
                }
                r.close();
                template = w.toString();
            }
            catch (IOException e) {
                logger.error("Failed to read puppet template for SCMEntryService", e);
            }
        }

        return template;
    }
}
