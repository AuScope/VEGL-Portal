/**
 * A template for generating a ANUGA run_busselton example.
 */
Ext.define('ScriptBuilder.templates.ANUGATemplate', {
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

        this._getTemplatedScriptGui(callback, 'run_busselton.py', {
            xtype : 'form',
            width : 450,
            height : 190,
            items : [{
                xtype : 'combo',
                fieldLabel : 'Dataset',
                name : 'busselton-file',
                allowBlank : false,
                valueField : 'localPath',
                displayField : 'localPath',
                anchor : '-20',
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'The path to a NetCDF input file.'
                }],
                store : Ext.create('Ext.data.Store', {
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
                })
            },{
                xtype : 'numberfield',
                fieldLabel : 'Base Scale',
                anchor : '-5',
                name : 'base_scale',
                value : 400000,
                allowBlank : false,
                minValue : 1,
            },{
                xtype : 'numberfield',
                fieldLabel : 'Tide',
                anchor : '-5',
                name : 'tide',
                value : 0.0,
                minValue : 0,
                step : 0.1,
                allowBlank : false,
            },{
                xtype : 'numberfield',
                fieldLabel : 'Final Time',
                anchor : '-5',
                name : 'final_time',
                value : 5000,
                allowBlank : false,
            }]
        });
    }

});

