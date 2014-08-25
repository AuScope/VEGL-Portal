/**
 * A template for generating a TCRM example.
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

        Ext.define('vegl.models.Locality', {
            extend: 'Ext.data.Model',

            fields: [
                { name: 'id', type: 'int' }, //Unique ID for this Locality
                { name: 'name', type: 'string' }, //short name of this Locality
                { name: 'description', type: 'string' }, // longer name for this Locality
                { name: 'eastBoundLongitude', type: 'double'}, //The spatial location of this Locality in WGS84
                { name: 'northBoundLatitude', type: 'double'}, //The spatial location of this Locality in WGS84
                { name: 'southBoundLatitude', type: 'double'}, //The spatial location of this Locality in WGS84
                { name: 'westBoundLongitude', type: 'double'} //The spatial location of this Locality in WGS84
            ],

            idProperty : 'id'
        });

        var localityStore = Ext.create('Ext.data.Store', {
            model : 'vegl.models.Locality',
            data : [
                {
                    id: 250913860,
                    name: 'Port Hedland',
                    description: 'Port Hedland, Western Australia, Australia.',
                    eastBoundLongitude: 124.0,
                    northBoundLatitude: -15.0,
                    southBoundLatitude: -26.0,
                    westBoundLongitude: 113.0
                }
            ]
        });

        var regionTab = {
            title : 'Region Options',
            items : [{
                xtype : 'combo',
                fieldLabel : 'Locality',
                name : 'locality',
                allowBlank : false,
                forceSelection : true,
                valueField : 'id',
                displayField : 'name',
                anchor : '-20',
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Locality for the simulation.'
                }],
                queryMode : 'local',
                store : localityStore,
                listeners : {
                    'select': function( combo, records, eOpts ) {
                        Ext.getCmp('TCRMEastBoundLon').setValue(records[0].get('eastBoundLongitude'));
                        Ext.getCmp('TCRMWestBoundLon').setValue(records[0].get('westBoundLongitude'));
                        Ext.getCmp('TCRMNorthBoundLat').setValue(records[0].get('northBoundLatitude'));
                        Ext.getCmp('TCRMSouthBoundLat').setValue(records[0].get('southBoundLatitude'));
                        Ext.getCmp('TCRMLocalityId').setValue(records[0].get('id'));
                        Ext.getCmp('TCRMLocalityName').setValue(records[0].get('description'));
                    }
                }
            },{
                xtype : 'numberfield',
                id : 'TCRMEastBoundLon',
                fieldLabel : 'East Bound Longitude',
                anchor : '-20',
                name : 'east-bound-lon',
                value : 0.0,
                allowBlank: false
            },{
                xtype : 'numberfield',
                id : 'TCRMNorthBoundLat',
                fieldLabel : 'North Bound Latitude',
                anchor : '-20',
                name : 'north-bound-lat',
                value : 0.0,
                allowBlank: false
            },{
                xtype : 'numberfield',
                id : 'TCRMWestBoundLon',
                fieldLabel : 'West Bound Longitude',
                anchor : '-20',
                name : 'west-bound-lon',
                value : 0.0,
                allowBlank: false
            },{
                xtype : 'numberfield',
                id : 'TCRMSouthBoundLat',
                fieldLabel : 'South Bound Latitude',
                anchor : '-20',
                name : 'south-bound-lat',
                value : 0.0,
                allowBlank: false
            },{
                xtype : 'textfield',
                id : 'TCRMLocalityId',
                fieldLabel : 'Locality ID',
                anchor : '-20',
                name : 'locality-id',
                allowBlank : false
            },{
                xtype : 'textfield',
                id : 'TCRMLocalityName',
                fieldLabel : 'Locality Name',
                anchor : '-20',
                name : 'locality-name',
                allowBlank : false
            }]
        }

        var MIN_SEED = 1, MAX_SEED = 10000000;
        // Return a random integer from [MIN_SEED, MAX_SEED)
        var seed = function() {
            return Math.floor(Math.random() * (MAX_SEED - MIN_SEED)) + MIN_SEED;
        };

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
            },{
                xtype : 'numberfield',
                fieldLabel : 'Random seed for season',
                anchor : '-20',
                name : 'season-seed',
                value : seed(),
                allowBlank: false
            },{
                xtype : 'numberfield',
                fieldLabel : 'Random seed for track',
                anchor : '-20',
                name : 'track-seed',
                value : seed(),
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

        var jobTab = {
            title : 'Job Options',
            items : [{
                xtype : 'numberfield',
                fieldLabel : 'Max Threads',
                anchor : '-20',
                margin : '10',
                name : 'n-threads',
                value : maxThreads,
                minValue : 1,
                allowBlank : false,
                allowDecimals : false,
                plugins : [{
                    ptype : 'fieldhelptext',
                    text : Ext.String.format('The maximum number of execution threads to run (this job will have {0} CPUs)', maxThreads)
                }]
            }]
        };

        this._getTemplatedScriptGui(callback, 'tcrm-porthedland.py', {
            xtype : 'form',
            width : 500,
            height : 520,
            items : [{
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
                items : [regionTab, trackGenTab, windfieldTab, jobTab]
            }]
        });
    }

});
