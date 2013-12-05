/**
 * A Panel for rendering a collection of provenance (CSW) records and optionally
 * capturing the provenance record data.
 */
Ext.define('vegl.widgets.ProvenanceRecordPanel', {
    extend : 'Ext.grid.Panel',

    alias : 'widget.provenancerecordpanel',
    
    statics : {
        /**
         * Because the click event handling occurs through a template, we need
         * to do some DOM traversal to map the click back to an ProvenanceRecordPanel
         */
        gHandleResourceClick : function(domElement) {
            //Lookup parent dom element for the provenance record panel
            var parentDom = Ext.fly(domElement).findParent('.x-panel');
            if (!parentDom) {
                return;
            }
            
            //Turn the parent dom element into a reference to the Ext.Component
            var id = parentDom.id;
            var sourcePanel = Ext.getCmp(id);
            if (!sourcePanel) {
                return;
            }
            
            //Get references to the CSWRecord/Online resource
            var orId = domElement.getAttribute("orid");
            var cswRecId = domElement.getAttribute("cswid");
            var cswRecord = sourcePanel.getStore().getById(cswRecId);
            if (!cswRecord) {
                return;
            }
            var onlineResource = cswRecord.getOnlineResourceById(orId);
            if (!onlineResource) {
                return;
            }
            
            //Raise the special click event
            sourcePanel.fireEvent('resourcecapture', sourcePanel, cswRecord, onlineResource);
        }
    },
    
    /**
     * Accepts the following additional config options:
     * 
     * records : An array of portal.csw.CSWRecord objects to populate this panel
     */
    constructor : function(config) {
        var store = Ext.create('Ext.data.Store', {
            model : 'portal.csw.CSWRecord',
            data : config.records
        });
        
        Ext.apply(config, {
            store : store,
            columns : [{
                //Title column
                text : 'Title',
                dataIndex : 'name',
                flex: 1,
                renderer : function(data) {
                    return '<div style="font:15px arial,sans-serif;">' + data + "</div>";
                }
            }],
            plugins: [{
                ptype: 'rowexpander',
                rowBodyTpl : [
                    '<tpl for="onlineResources">',
                    //'    <p>{[values.data.name]} - <a target="_blank" href="{[values.data.url]}">Download from {[portal.util.URL.extractHost(values.data.url)]}</a> - <a cswid="{[parent.id]}" orid="{[values.data.id]}" onclick="vegl.widgets.ProvenanceRecordPanel.gHandleResourceClick(this)" href="javascript:void(0)">Use in this job</a></p>',
                    '    <p>{[values.data.name]} <span style="text-align: right; display: inline-block; position: absolute; right: 10px;"><a target="_blank" href="{[values.data.url]}"><img title="Download from {[portal.util.URL.extractHost(values.data.url)]} to your local machine" src="img/download.png"></a> <a cswid="{[parent.id]}" orid="{[values.data.id]}" onclick="vegl.widgets.ProvenanceRecordPanel.gHandleResourceClick(this)" href="javascript:void(0)"><img title="Save this data for use in a new job" src="img/disk.png"></a></span></p>',
                    '</tpl>'
                ]
            }]
        });
        
        this.callParent(arguments);
        
        this.addEvents(['resourcecapture']);
    }
    
});