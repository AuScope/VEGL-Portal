package org.auscope.portal.server.web.service;

import java.util.Properties;

import org.apache.velocity.app.VelocityEngine;
import org.auscope.portal.core.test.PortalTestClass;
import org.auscope.portal.server.vegl.VLScmSnapshotDao;
import org.auscope.portal.server.web.service.scm.Solution;
import org.auscope.portal.server.web.service.scm.Toolbox;
import org.junit.Before;
import org.junit.Test;
import org.springframework.ui.velocity.VelocityEngineFactoryBean;

/**
 * Unit tests for ScmEntryService
 *
 * @author Geoff Squire
 *
 */
public class TestScmEntryService extends PortalTestClass {
    private ScmEntryService service;
    private VLScmSnapshotDao mockSnapshotDao = context.mock(VLScmSnapshotDao.class);

    @Before
    public void init() throws Exception {
        //Create VelocityEngine object to be used for constructing mail content.
        VelocityEngineFactoryBean vecEngFBean = new VelocityEngineFactoryBean();
        Properties p = new Properties();
        p.put("resource.loader", "class");
        p.put("class.resource.loader.class", "org.apache.velocity.runtime.resource.loader.ClasspathResourceLoader");
        vecEngFBean.setVelocityProperties(p);
        VelocityEngine velocityEngine = vecEngFBean.createVelocityEngine();

        service = new ScmEntryService(mockSnapshotDao, velocityEngine);
    }

    @Test
    public void testGetSolution() throws Exception {
        final String solutionId = "http://vhirl-dev.csiro.au/scm/solutions/1";

        Solution solution = service.getScmSolution(solutionId);
        System.out.println("name = " + solution.getName());
        System.out.println("createdAt = " + solution.getCreatedAt());
        Toolbox toolbox = solution.getToolbox();
        System.out.println("toolbox = ");
        System.out.println("    name = " + toolbox.getName());
        System.out.println("    source = " + toolbox.getSource());
        System.out.println("    dependencies = " + toolbox.getDependencies());
    }

    @Test
    public void testCreatePuppetModule() throws Exception {
        final String solutionId = "http://vhirl-dev.csiro.au/scm/solutions/2";

        String puppet = service.createPuppetModule(solutionId);
        System.out.println(puppet);
    }
}
