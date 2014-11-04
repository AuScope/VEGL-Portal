package org.auscope.portal.server.web.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.velocity.app.VelocityEngine;
import org.auscope.portal.server.vegl.VLScmSnapshot;
import org.auscope.portal.server.vegl.VLScmSnapshotDao;
import org.auscope.portal.server.web.service.scm.Solution;
import org.auscope.portal.server.web.service.scm.Toolbox;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.velocity.VelocityEngineUtils;
import org.springframework.web.client.RestTemplate;

/**
 * A service for handling Scientific Code Marketplace templates.
 *
 * @author Geoff Squire
 *
 */
@Service
public class ScmEntryService {
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
    public ScmEntryService(VLScmSnapshotDao vlScmSnapshotDao,
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
    public String getScmEntrySnapshotId(String entryId,
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
     * Return the puppet module for SCM solution.
     *
     * Generates a puppet module that will provision a VM suitable for
     * running a job using the SCM entry.
     *
     * Placeholder parameters:
     *
     * <table>
     * <tr><td>sc-name</td><td>Name of the scientific code</td></tr>
     * <tr><td>source</td><td>Map of source parameters</td></tr>
     * <tr><td>source.type</td><td>Source repository type ("git", "svn")</td></tr>
     * <tr><td>source.url</td><td>Source repository URL</td></tr>
     * <tr><td>source.checkout</td><td>Checkout target for source repository</td></tr>
     * <tr><td>source.exec</td><td>Shell command to execute after source checkout.</td></tr>
     * <tr><td>system_packages</td><td>List of system packages</td></tr>
     * <tr><td>python_packages</td><td>List of python packages</td></tr>
     * <tr><td>python_requirements</td><td>Path to a pip requirements.txt file in the source</td></tr>
     * </table>
     *
     * @param solutionUrl String URL of the SCM solution
     * @return String contents of the puppet module
     */
    public String createPuppetModule(String solutionUrl) {
        // Fetch the solution entry from the SCM
        Solution solution = getScmSolution(solutionUrl);

        // Create a velocity template vars map from the entry
        Map<String, Object> vars = puppetTemplateVars(solution);

        // Create the puppet module
        return VelocityEngineUtils.mergeTemplateIntoString(velocityEngine,
                                                           PUPPET_TEMPLATE,
                                                           "UTF-8",
                                                           vars);
    }

    /**
     * Retrieve and decode an SCM entry.
     *
     * @param entryUrl String URL of the catalogue entry
     * @return Map<String, Object> deserialization of the json response
     *
     */
    public Solution getScmSolution(String entryUrl) {
        RestTemplate rest = new RestTemplate();
        Solution solution = rest.getForObject(entryUrl, Solution.class);
        return solution;
    }

    private Map<String, Object> puppetTemplateVars(Solution solution) {
        Map<String, Object> vars = new HashMap<String, Object>();
        // Make sure we have full Toolbox details.
        Toolbox toolbox = solution.getToolbox(true);

        vars.put("sc_name", safeScName(toolbox));
        vars.put("source", toolbox.getSource());

        ArrayList<String> systemPackages = new ArrayList<String>();
        ArrayList<String> pythonPackages = new ArrayList<String>();
        ArrayList<String> requirements = new ArrayList<String>();
        // Merge dependencies from solution and toolbox
        dependencies(toolbox.getDependencies(),
                     systemPackages,
                     pythonPackages,
                     requirements);
        dependencies(solution.getDependencies(),
                     systemPackages,
                     pythonPackages,
                     requirements);
        vars.put("system_packages", systemPackages);
        vars.put("python_packages", pythonPackages);
        vars.put("python_requirements", requirements);
        return vars;
    }

    private void dependencies(List<Map<String, String>> deps,
                              List<String> systemPackages,
                              List<String> pythonPackages,
                              List<String> requirements) {
        for (Map<String, String> dep: deps) {
            switch (dep.get("type")) {
            case "system":
                systemPackages.add(dep.get("name"));
                break;
            case "python":
                if (dep.containsKey("path")) {
                    requirements.add(dep.get("path"));
                }
                else {
                    pythonPackages.add(dep.get("name"));
                }
                break;
            default:
                logger.warn("Unknown dependency type (" + dep + ")");
            }
        }
    }

    /**
     * Return a safe name for the scientific code used by toolbox.
     *
     * The name will be used to generate puppet classes and the path
     * where the code will be installed on the VM.
     *
     * Simple solution: strip out all non-word characters as defined
     * by the java regex spec.
     *
     */
    private String safeScName(Toolbox toolbox) {
        return toolbox.getName().replaceAll("\\W", "");
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
}
