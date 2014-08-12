/**
 * A template for generating a eScript gravity inversion example.
 */
Ext.define('ScriptBuilder.templates.TCRMPortHedlandTemplate', {
    extend : 'ScriptBuilder.templates.BaseTemplate',

    description : null,
    name : null,

    constructor : function(config) {
        this.callParent(arguments);
    },

    /**
     * See parent description
     */
    requestScript : function(callback) {
        var jobId = this.wizardState.jobId;
        var maxThreads = this.wizardState.ncpus;

        var jobStore = Ext.create('Ext.data.Store', {
            model : 'vegl.models.Download',
            proxy : {
                type : 'ajax',
                url : 'getAllJobInputs.do',
                extraParams : {
                    jobId : jobId
                },
                reader : {
                    type : 'json',
                    root : 'data'
                }
            },
            autoLoad : true
        });

        var trackGenTab = {
            title : 'Track Generator Options',
            items : [{
                xtype : 'numberfield',
                fieldLabel : 'Number of simulations',
                anchor : '-20',
                name : 'num-simulations',
                value : 1000,
                allowBlank: false
            },{
                xtype : 'numberfield',
                fieldLabel : 'Years per simulation',
                anchor : '-20',
                name : 'years-per-simulation',
                value : 1,
                allowBlank: false
            }]
        };

        var windfieldTab = {
            title : 'Windfield Interface Options',
            items : [{
                xtype : 'numberfield',
                fieldLabel : 'Resolution',
                anchor : '-20',
                name : 'windfield-interface-resolution',
                value : 0.05,
                minValue : 0.02,
                maxValue : 0.5,
                step : 0.01,
                allowBlank: false
            }]
        };

        this._getTemplatedScriptGui(callback, 'tcrm-porthedland.py', {
            xtype : 'form',
            width : 500,
            height : 520,
            items : [{
                xtype : 'combo',
                fieldLabel : 'Dataset',
                name : 'inversion-file',
                allowBlank : false,
                valueField : 'localPath',
                displayField : 'localPath',
                anchor : '-20',
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'The path to a NetCDF input file.'
                }],
                store : jobStore,
                listeners:{
                    'select': function( combo, records, eOpts ){
                        var x = Math.abs(records[0].get('eastBoundLongitude') - records[0].get('westBoundLongitude'));
                        var y = Math.abs(records[0].get('northBoundLatitude') - records[0].get('southBoundLatitude'));
                    }
                }
            },{
                xtype : 'tabpanel',
                anchor : '100%',
                plain : true,
                margins : '10',
                border : false,
                defaults : {
                    layout : 'form',
                    padding : '20',
                    border : false
                },
                items : [trackGenTab, windfieldTab]
            }]
        });
    }

});
