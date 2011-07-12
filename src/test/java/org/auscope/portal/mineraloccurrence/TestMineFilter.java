package org.auscope.portal.mineraloccurrence;

import org.junit.Test;
import org.w3c.dom.Document;
import org.auscope.portal.TestUtil;
import org.auscope.portal.server.domain.ogc.FilterTestUtilities;

import junit.framework.Assert;

import java.io.IOException;

/**
 * User: Mathew Wyatt
 * Date: 25/03/2009
 * Time: 8:23:09 AM
 */
public class TestMineFilter {

    /**
     * Test without mine name. If there is no name specified then all of the mines should be queried.
     */
    @Test
    public void testWithNoMineName() throws IOException {
        MineFilter mineFilter = new MineFilter("");
        
        String filter = mineFilter.getFilterStringAllRecords();
        Assert.assertEquals("", filter);
    }

    /**
     *  Test with a mine name. A filter query should be generated searching for mines with the given name.
     */
    @Test
    public void testWithAMineName() throws Exception {
        MineFilter mineFilter = new MineFilter("Dominion Copper Mine");
        
        String filter = mineFilter.getFilterStringAllRecords();
        Document doc = FilterTestUtilities.parsefilterStringXML(filter);
        
        FilterTestUtilities.runNodeSetValueCheck(doc, "/descendant::ogc:PropertyIsLike/ogc:PropertyName", new String[] {"er:mineName/er:MineName/er:mineName"}, 1);
        FilterTestUtilities.runNodeSetValueCheck(doc, "/descendant::ogc:PropertyIsLike/ogc:Literal", new String[] {"Dominion Copper Mine"}, 1);
    }

}
