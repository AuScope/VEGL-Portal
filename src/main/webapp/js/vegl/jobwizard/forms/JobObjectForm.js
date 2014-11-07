/**
 * Job wizard form for creating and editing a new Job Object
 *
 * Author - Josh Vote
 */

Ext.define('vegl.jobwizard.forms.JobObjectForm', {
    extend : 'vegl.jobwizard.forms.BaseJobWizardForm',

    imageStore : null,
    computeTypeStore : null,
    storageServicesStore : null,
    computeServicesStore : null,

    /**
     * Creates a new JobObjectForm form configured to write/read to the specified global state
     */
    constructor: function(wizardState) {
        var jobObjectFrm = this;

        this.imageStore = Ext.create('Ext.data.Store', {
            model: 'vegl.models.MachineImage',
            proxy: {
                type: 'ajax',
                url: 'getVmImagesForComputeService.do',
                extraParams: {
                    jobId: wizardState.jobId
                },
                reader: {
                   type: 'json',
                   root : 'data'
                }
            }
        });
        
        this.computeTypeStore = Ext.create('Ext.data.Store', {
            model: 'vegl.models.ComputeType',
            proxy: {
                type: 'ajax',
                url: 'getVmTypesForComputeService.do',
                extraParams: {
                    jobId: wizardState.jobId
                },
                reader: {
                   type: 'json',
                   root : 'data'
                }
            }
        });

        this.storageServicesStore = Ext.create('Ext.data.Store', {
            fields : [{name: 'id', type: 'string'},
                      {name: 'name', type: 'string'}],
            proxy: {
                type: 'ajax',
                url: 'getStorageServices.do',
                reader: {
                   type: 'json',
                   root : 'data'
                }
            },
            autoLoad : true
        });
        this.storageServicesStore.load();

        this.computeServicesStore = Ext.create('Ext.data.Store', {
            fields : [{name: 'id', type: 'string'},
                      {name: 'name', type: 'string'}],
            proxy: {
                type: 'ajax',
                url: 'getComputeServices.do',
                extraParams: {
                    jobId: wizardState.jobId
                },
                reader: {
                   type: 'json',
                   root : 'data'
                }
            },
            autoLoad : true
        });
        this.computeServicesStore.load();

        this.callParent([{
            wizardState : wizardState,
            bodyStyle: 'padding:10px;',
            frame: true,
            defaults: { anchor: "100%" },
            labelWidth: 150,
            autoScroll: true,
            listeners : {
                //The first time this form is active create a new job object
                jobWizardActive : function() {
                    //If we have a jobId, load that, OTHERWISE the job will be created later
                    if (jobObjectFrm.wizardState.jobId) {
                        jobObjectFrm.getForm().load({
                            url : 'getJobObject.do',
                            waitMsg : 'Loading Job Object...',
                            params : {
                                jobId : jobObjectFrm.wizardState.jobId
                            },
                            failure : Ext.bind(jobObjectFrm.fireEvent, jobObjectFrm, ['jobWizardLoadException']),
                            success : function(frm, action) {
                                var responseObj = Ext.JSON.decode(action.response.responseText);

                                if (responseObj.success) {
                                    //Loads the image store of user selected compute provider
                                    jobObjectFrm.imageStore.load({
                                        params : {
                                            computeServiceId : responseObj.data[0].computeServiceId
                                        }
                                    });
                                    jobObjectFrm.computeTypeStore.load({
                                        params : {
                                            computeServiceId : responseObj.data[0].computeServiceId
                                        },
                                        scope: jobObjectFrm,
                                        callback: function(records, operation, success) {
                                            jobObjectFrm.preselectVmType();
                                        }
                                    });

                                    frm.setValues(responseObj.data[0]);
                                    jobObjectFrm.wizardState.jobId = frm.getValues().id;

                                    // Store the vm type if specified in the job
                                    jobObjectFrm.wizardState.jobComputeInstanceType = responseObj.data[0].computeInstanceType;
                                }
                            }
                        });
                    }
                }
            },
            fieldDefaults: {
                labelWidth: 120
            },
            items: [{
                xtype: 'textfield',
                name: 'name',
                itemId : 'name',
                fieldLabel: 'Job Name',
                value : Ext.util.Format.format('myJob about zzz at {0}', Ext.Date.format(new Date(), 'Y-m-d g:i a')),
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Enter a useful name for your job here.'
                }],
                allowBlank: true
            },{
                xtype: 'textfield',
                name: 'description',
                itemId : 'description',
                fieldLabel: 'Job Description',
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Enter an optional description for your job here.'
                }],
                allowBlank: true
            },{
                xtype : 'combo',
                fieldLabel : 'Compute Provider',
                name: 'computeServiceId',
                itemId : 'computeServiceId',
                allowBlank: false,
                queryMode: 'local',
                triggerAction: 'all',
                displayField: 'name',
                valueField : 'id',
                typeAhead: true,
                forceSelection: true,
                store : this.computeServicesStore,
                listConfig : {
                    loadingText: 'Getting Compute Services...',
                    emptyText: 'No compute services found.'
                },
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Select a location where your data will be processed. Different locations will have different toolboxes.'
                }],
                listeners : {
                    select : Ext.bind(this.onComputeSelect, this)
                }
            },{
                xtype : 'combo',
                fieldLabel : 'Storage Provider',
                name: 'storageServiceId',
                itemId : 'storageServiceId',
                allowBlank: false,
                queryMode: 'local',
                triggerAction: 'all',
                displayField: 'name',
                valueField : 'id',
                typeAhead: true,
                forceSelection: true,
                store : this.storageServicesStore,
                listConfig : {
                    loadingText: 'Getting Storage Services...',
                    emptyText: 'No storage services found.'
                },
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Select a location where your data will be stored.'
                }]
            },{
                xtype : 'machineimagecombo',
                fieldLabel : 'Toolbox',
                name: 'computeVmId',
                itemId : 'image-combo',
                allowBlank: false,
                queryMode: 'local',
                triggerAction: 'all',
                typeAhead: true,
                forceSelection: true,
                store : this.imageStore,
                listConfig : {
                    loadingText: 'Getting tools...',
                    emptyText: 'No matching toolboxes found. Select a different compute location.'
                },
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Select a toolbox that contains software that you would like to use to process your data.'
                }]
            },{
                xtype : 'combo',
                fieldLabel : 'Resources',
                name: 'computeTypeId',
                itemId : 'resource-combo',
                displayField : 'longDescription',
                valueField : 'id',
                allowBlank: false,
                queryMode: 'local',
                triggerAction: 'all',
                typeAhead: true,
                forceSelection: true,
                store : this.computeTypeStore,
                listConfig : {
                    loadingText: 'Getting available resources...',
                    emptyText: 'No matching resource configurations found. Select a different compute location.'
                },
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Select a compute resource configuration that is sufficient for your needs.'
                }]
            },{
                xtype : 'checkboxfield',
                fieldLabel : 'Email Notification',
                name: 'emailNotification',
                itemId : 'emailNotification',
                checked: true,
                plugins: [{
                    ptype: 'fieldhelptext',
                    text: 'Tick to receive email notification upon job processing.'
                }]
            },
            { xtype: 'hidden', name: 'id' },
            { xtype: 'hidden', name: 'storageProvider' },
            { xtype: 'hidden', name: 'storageEndpoint' },
            { xtype: 'hidden', name: 'registeredUrl' },
            { xtype: 'hidden', name: 'vmSubsetFilePath' },
            { xtype: 'hidden', name: 'vmSubsetUrl' }
            ]
        }]);
    },

    onComputeSelect : function(combo, records) {
        if (!records.length) {
            this.imageStore.removeAll();
            this.computeTypeStore.removeAll();
            return;
        }

        this.getComponent('image-combo').clearValue();
        this.imageStore.load({
            params : {
                computeServiceId : records[0].get('id')
            }
        });

        var jobObjectFrm = this;
        this.computeTypeStore.load({
            params : {
                computeServiceId : records[0].get('id')
            },
            scope: jobObjectFrm,
            callback: function(records, operation, success) {
                jobObjectFrm.preselectVmType();
            }
        });
    },

    preselectVmType: function() {
        var jobObjectFrm = this;

        // Select a vm type that has ncpus
        // >= nthreads if one hasn't
        // already been selected.
        if (jobObjectFrm.wizardState.nthreads &&
            !jobObjectFrm.wizardState.jobComputeInstanceType) {
            // Get vm types that are big enough
            var vmtype;
            var ncpus = 99999;
            jobObjectFrm.computeTypeStore.each(function(r) {
                if (r.get('vcpus') < ncpus &&
                    r.get('vcpus') >= jobObjectFrm.wizardState.nthreads) {
                    vmtype = r;
                }
            });
            if (vmtype) {
                jobObjectFrm.getForm().setValues({computeTypeId: vmtype.get('id')});
            }
        }
    },

    getTitle : function() {
        return "Enter job details...";
    },

    beginValidation : function(callback) {
        var jobObjectFrm = this;
        var wizardState = this.wizardState;

        //Ensure we have entered all appropriate fields
        if (!jobObjectFrm.getForm().isValid()) {
            callback(false);
            return;
        }

        //Then save the job to the database before proceeding
        var values = jobObjectFrm.getForm().getValues();
        values.seriesId = jobObjectFrm.wizardState.seriesId;
        Ext.Ajax.request({
            url : 'updateOrCreateJob.do',
            params : values,
            callback : function(options, success, response) {
                if (!success) {
                    portal.widgets.window.ErrorWindow.showText('Error saving details', 'There was an unexpected error when attempting to save the details on this form. Please try again in a few minutes.');
                    callback(false);
                    return;
                }

                var responseObj = Ext.JSON.decode(response.responseText);
                if (!responseObj.success) {
                    portal.widgets.window.ErrorWindow.showText('Error saving details', 'There was an unexpected error when attempting to save the details on this form.', responseObj.msg);
                    callback(false);
                    return;
                }

                jobObjectFrm.wizardState.jobId = responseObj.data[0].id;
                // Store user selected toolbox into wizard state. That toolbox
                // will be used to select relevant script templates or examples.
                wizardState.toolbox = jobObjectFrm.getForm().findField("computeVmId").getRawValue();
                
                // Store selected resource limits into wizard state. These values will be included
                // in template generation (to ensure valid numbers of CPU's are chosen etc)
                var computeTypeId = jobObjectFrm.getComponent('resource-combo').getValue();
                var computeType = jobObjectFrm.computeTypeStore.getById(computeTypeId);
                wizardState.ncpus = computeType.get('vcpus');
                wizardState.nrammb = computeType.get('ramMB');
                callback(true);
            }
        });
    },

    getHelpInstructions : function() {
        var name = this.getComponent('name');
        var description = this.getComponent('description');
        var compute = this.getComponent('computeServiceId');
        var storage = this.getComponent('storageServiceId');
        var toolbox = this.getComponent('image-combo');
        var emailNotification = this.getComponent('emailNotification');

        return [Ext.create('portal.util.help.Instruction', {
            highlightEl : name.getEl(),
            title : 'Name your job',
            anchor : 'bottom',
            description : 'Every job requires a name. Names don\'t have to be unique but it\'s recommended you choose something meaningful as it will be the primary way to identify this job in the future.'
        }), Ext.create('portal.util.help.Instruction', {
            highlightEl : description.getEl(),
            title : 'Describe your job',
            anchor : 'bottom',
            description : 'Enter an optional description for your job here.'
        }), Ext.create('portal.util.help.Instruction', {
            highlightEl : compute.getEl(),
            title : 'Compute Location',
            anchor : 'bottom',
            description : 'It is here where you can select a physical location where your job will be processed. Different locations may have access to different toolboxes.'
        }), Ext.create('portal.util.help.Instruction', {
            highlightEl : storage.getEl(),
            title : 'Storage Location',
            anchor : 'bottom',
            description : 'It is here where you can select a physical location where your job inputs and outputs will be stored. It doesn\'t have to be the same location as the compute provider, but keeping them the same will often make jobs complete faster.'
        }), Ext.create('portal.util.help.Instruction', {
            highlightEl : toolbox.getEl(),
            title : 'Storage Toolbox',
            anchor : 'bottom',
            description : 'A toolbox is a collection of software packages that will be made available to your job when it starts processing. Some toolboxes are restricted to authorised users for licensing reasons. You will not be able to choose a toolbox until after you select a compute provider.'
        }), Ext.create('portal.util.help.Instruction', {
            highlightEl : emailNotification.getEl(),
            title : 'Job completion email notification',
            anchor : 'bottom',
            description : 'The VL will send out email notification to your email address upon job completion. Untick the checkbox if you don\'t want to receive the notification.'
        })];
    }
});
