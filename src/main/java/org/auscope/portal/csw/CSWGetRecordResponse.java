package org.auscope.portal.csw;

import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.xpath.XPathFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.auscope.portal.csw.record.CSWRecord;

/**
 * User: Mathew Wyatt
 * Date: 11/02/2009
 * Time: 11:56:00 AM
 */
public class CSWGetRecordResponse {
    private CSWRecord[] records; 
    private Document recordResponse;

    // -------------------------------------------------------------- Constants
    
    /** Log object for this class. */
    protected final Log log = LogFactory.getLog(getClass());
    
    // --------------------------------------------------------- Public Methods
    
    
    public CSWGetRecordResponse(Document getRecordResponseText) {
        this.recordResponse = getRecordResponseText;
    }

    
    public CSWRecord[] getCSWRecords() throws XPathExpressionException {
        
        XPath xPath = XPathFactory.newInstance().newXPath();
        xPath.setNamespaceContext(new CSWNamespaceContext());
        
        String serviceTitleExpression 
                = "/csw:GetRecordsResponse/csw:SearchResults/gmd:MD_Metadata";
        
        NodeList nodes = (NodeList) xPath.evaluate( serviceTitleExpression
                                                  , this.recordResponse
                                                  , XPathConstants.NODESET );

        log.debug("Number of records retrieved from GeoNetwork: " + nodes.getLength());
        
        records = new CSWRecord[nodes.getLength()];
        for(int i=0; i<nodes.getLength(); i++ ) {
        	Node metadataNode = nodes.item(i);
        	CSWRecordTransformer transformer = new CSWRecordTransformer(metadataNode);
            records[i] = transformer.transformToCSWRecord();
            log.debug("GN layer " + (i+1) + " : " + records[i].toString());            
        }

        return records;
    }

}
