/*
 * This file is part of the AuScope Virtual Rock Lab (VRL) project.
 * Copyright (c) 2009 ESSCC, The University of Queensland
 *
 * Licensed under the terms of the GNU Lesser General Public License.
 */

// reference local blank image
Ext.BLANK_IMAGE_URL = 'js/external/extjs/resources/images/default/s.gif';

Ext.namespace('GridSubmit');

GridSubmit.ControllerURL = "gridsubmit.html";


////////////////////////
////// Callbacks ///////
////////////////////////

//
// Called when a JsonStore fails retrieving data from the server
//
GridSubmit.onLoadException = function(proxy, options, response, e) {
    if (response.status != 0) {
        GridSubmit.showError("Could not interpret server response "+
            "(most likely your session has expired). "+
            "Please try reloading the page.");
    } else {
        GridSubmit.showError("Could not retrieve data from the server ("+
            response.statusText+").");
    }
};

//
// Called when the user tries to navigate away from this site
//
GridSubmit.onWindowUnloading = function(e) {
    if (GridSubmit.confirmUnloading != false) {
        e.browserEvent.returnValue = "All entered details will be lost!";
    }
};

//
// Called when the job object or file list request fails
//
GridSubmit.onLoadDataFailure = function(response, request) {
    GridSubmit.showError('Error retrieving data from the server!');
};

//
// Called when the job submit request fails
//
GridSubmit.onSubmitFailure = function(form, action) {
    switch (action.failureType) {
        case Ext.form.Action.CLIENT_INVALID:
            Ext.Msg.alert('Failure', 'Could not execute submit request.');
            break;
        case Ext.form.Action.CONNECT_FAILURE:
            break;
        case Ext.form.Action.SERVER_INVALID:
           Ext.Msg.alert('Failure', action.result.msg);
    }	
};

//
// Called when the file upload request fails
//
GridSubmit.onUploadFailure = function(form, action) {
    GridSubmit.showError('Could not upload file. '+action.result.error);
};

//
// Callback for the cancelSubmission request
//
GridSubmit.onCancelResponse = function(response, request) {
    GridSubmit.confirmUnloading = false;
    window.location = "joblist.html";
};

//
// Callback for delete files request
//
GridSubmit.onDeleteResponse = function(response, request) {
    // Retrieve updated list of job files
    GridSubmit.loadJobFiles();
};

//
// Callback for a successful job submit request
//
GridSubmit.onSubmitJob = function(form, action) {
    //GridSubmit.successDlg('The job was successfully submitted!');
    GridSubmit.confirmUnloading = false;
    //window.location = "joblist.html";
};

//
// Callback for a successful file upload request
//
GridSubmit.onUploadFile = function(form, action) {
    if (action.result.success == "true") {
        GridSubmit.successDlg('The file was successfully uploaded!');
        var fileStore = Ext.getCmp('file-grid').getStore();
        var idx = fileStore.find('name', action.result.name);
        if (idx > -1) {
            fileStore.removeAt(idx);
        }

        var newFile = new GridSubmit.FileRecord({
            name		: action.result.name,
            size		: action.result.size,
            parentPath	: action.result.parentPath
        });
        fileStore.add(newFile);
    } else {
        GridSubmit.showError('Error uploading file. '+action.result.error);
    }
    Ext.getCmp('filesForm').getForm().reset();
};

//
// Callback for a successful file listing request
//
GridSubmit.onFileListResponse = function(response, request) {
    var fileStore = Ext.getCmp('file-grid').getStore();
    fileStore.removeAll();
    var resp = Ext.decode(response.responseText);
    for (var i=0; i<resp.files.length; i++) {
        var newFile = new GridSubmit.FileRecord({
            name: resp.files[i].name,
            size: resp.files[i].size,
            parentPath: resp.files[i].parentPath
        });
        fileStore.add(newFile);
    }
    Ext.getCmp('fileRetrievalMessage').hide();
};


//
// Callback for a successful job object request
//
GridSubmit.onLoadJobObject = function(response, request) {
    // get script file
    GridSubmit.loadJobFiles();
};

////////////////////////
////// Functions ///////
////////////////////////

//
// Shows an error dialog with given message
//
GridSubmit.showError = function(message) {
    Ext.Msg.show({
        title: 'Error',
        msg: message,
        buttons: Ext.Msg.OK,
        icon: Ext.Msg.ERROR
    });
};

//
// Shows a success dialog with given message
//
GridSubmit.successDlg = function(message) {
    Ext.Msg.show({
        title: 'Success',
        msg: message,
        buttons: Ext.Msg.OK,
        icon: Ext.Msg.INFO
    });
};

//
// Loads a list of job files
//
GridSubmit.loadJobFiles = function() {
    Ext.Ajax.request({
        url: 'listJobFiles.do',
        success: GridSubmit.onFileListResponse,
        failure: GridSubmit.onLoadDataFailure
    });
};

//
//Loads status of Grid transfer on Job Submission
//
GridSubmit.getJobStatus = function() {
 Ext.Ajax.request({
     url: 'getJobStatus.do',
     success: GridSubmit.onJobStatusResponse,
     failure: GridSubmit.onJobStatusResponse
 });
};

//
// Loads the populated job object from the server
//
GridSubmit.loadJobObject = function() {
    // Load job details from session
    Ext.getCmp('jobObjectForm').getForm().load({
        url: 'getJobObject.do',
        success: GridSubmit.onLoadJobObject,
        failure: GridSubmit.onLoadDataFailure,
        waitMsg: 'Retrieving data, please wait...',
        waitTitle: 'Submit Job'
    });
};

//Task and TaskRunner add for job submission status update.
var task = {
	run: GridSubmit.getJobStatus,
	interval: 10000 //10 seconds
};

var runner = new Ext.util.TaskRunner();

//
//Callback for a successful status update request
//checks if success transfer and redirects to jobList.
GridSubmit.onJobStatusResponse = function(response, request) {
	var statusField = Ext.getCmp('statusArea');
	var resp = Ext.decode(response.responseText);
	statusField.setText(resp.data);
	
	//This means file transfer complete.
	if(resp.jobStatus == "Running")
	{	
		GridSubmit.confirmUnloading = false;
		runner.stop(task);
		window.location = "joblist.html";
	}else if(resp.jobStatus == "Failed"){
		GridSubmit.confirmUnloading = false;
		Ext.Msg.alert('Failure', 'Job submission failed.');	
		runner.stop(task);
	}
};

//
// Requests submission of the current job from the server
//
GridSubmit.submitJob = function() {
	
	runner.start(task);
    
    Ext.getCmp('jobObjectForm').getForm().submit({
        url: 'submitJob.do',
        success: GridSubmit.onSubmitJob,
        failure: GridSubmit.onSubmitFailure,
        params: {
            'seriesId': GridSubmit.seriesId,
            'seriesName': GridSubmit.seriesName,
            'seriesDesc': GridSubmit.seriesDesc
        },
        waitMsg: 'Submitting job, please wait...',
        waitTitle: 'Submit Job'
    });
};

//
// Called when user dismisses the confirmation dialog of a file upload
//
GridSubmit.confirmOverwrite = function(btn) {
    if (btn=='yes') {
        GridSubmit.uploadFile(null, null, true);
    }
};

//
// Requests removal of uploaded files
//
GridSubmit.deleteFiles = function() {
    var fileGrid = Ext.getCmp('file-grid');
    if (fileGrid.getSelectionModel().getCount() > 0) {
        var selData = fileGrid.getSelectionModel().getSelections();
        var files = new Array();
        var jobIds = new Array();
        for (var i=0; i<selData.length; i++) {
            files.push(selData[i].get('name'));
        }
        
        Ext.Msg.show({
            title: 'Delete Files',
            msg: 'Are you sure you want to delete the selected files?',
            buttons: Ext.Msg.YESNO,
            icon: Ext.Msg.WARNING,
            animEl: 'delete-files-btn',
            closable: false,
            fn: function(btn) {
                if (btn == 'yes') {
                    Ext.Ajax.request({
                        url: 'deleteFiles.do',
                        success: GridSubmit.onDeleteResponse,
                        failure: GridSubmit.onDeleteResponse, 
                        params: { 
                    	          'files': Ext.encode(files)
                        }
                    });
                }
            }
        });
    }
};

//
// Requests upload of a file to the server
//
GridSubmit.uploadFile = function(b, e, overwrite) {
    if (Ext.getCmp('filesForm').getForm().isValid()) {
        var ufName = Ext.getCmp('fileInputField').getValue();
        var fileStore = Ext.getCmp('file-grid').getStore();
        if (!overwrite && fileStore.find('name', ufName) > -1) {
            Ext.Msg.confirm('File exists',
                   'A file by that name already exists. Overwrite?',
                   GridSubmit.confirmOverwrite);
            return;
        }
        
        var jobID = "Common";
        Ext.getCmp('filesForm').getForm().submit({
            url: 'uploadFile.do',
            success: GridSubmit.onUploadFile,
            failure: GridSubmit.onUploadFailure,
            waitMsg: 'Uploading file, please wait...',
            waitTitle: 'Upload file'
        });
    } else {
        Ext.Msg.alert('No file selected',
                'Please use the browse button to select a file.');
    }
};

//
// Shows a confirmation dialog after user selected 'Cancel'
//
GridSubmit.confirmCancel = function() {
    Ext.Msg.show({
        title: 'Cancel Job Submit',
        msg: 'Are you sure you want to cancel? All changes will be lost!',
        buttons: Ext.Msg.YESNO,
        icon: Ext.Msg.WARNING,
        animEl: 'cancelBtn',
        closable: false,
        fn: function(btn) {
            if (btn == 'yes') {
                Ext.Ajax.request({
                    url: 'cancelSubmission.do',
                    success: GridSubmit.onCancelResponse,
                    failure: GridSubmit.onCancelResponse
                });
            }
        }
    });
};

//downloads given file specified.
GridSubmit.downloadFile = function(filePath, file) {
    var body = Ext.getBody();
    var frame = body.createChild({
        tag:'iframe',
        cls:'x-hidden',
        id:'iframe',
        name:'iframe'
    });
    var myGrid = Ext.getCmp('file-grid');
    var jobData = myGrid.getSelectionModel().getSelected().data;
    var params = {dirPath: jobData.parentPath, filename: jobData.name};
    var form = body.createChild({
        tag:'form',
        cls:'x-hidden',
        id:'form',
        //action: 'downloadInputFile.do?'+Ext.urlEncode(params),
        target:'iframe',
        method:'POST'
    });
    //form.dom.params.dirPath = jobData.parentPath;
    //form.dom.params.filename = jobData.name;
    form.dom.action = 'downloadInputFile.do?'+Ext.urlEncode(params);
    form.dom.submit();
    //Ext.urlEncode(params)
    //window.location =  "downloadInputFile.do?dirPath="+filePath+"&filename="+file;
};

//
// This is the main layout definition.
//
GridSubmit.initialize = function() {
    Ext.QuickTips.init();
    
    // Store for job submission status update.
    var gridTransferStatus = new Ext.data.JsonStore({
        url: 'getTransferStatus.do',
        root: 'transferStatus',
        fields: [ { name: 'value', type: 'string' } ],
        listeners: { 'loadexception': GridSubmit.onLoadException }
    });
    
    // Store for current user's list of series
    var mySeriesStore = new Ext.data.JsonStore({
        url: 'mySeries.do',
        root: 'series',
        autoLoad: true,
        fields: [
            { name: 'id', type: 'int' },
            { name: 'name', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'user', type: 'string'}
        ],
        listeners: { 'loadexception': GridSubmit.onLoadException }
    });

    GridSubmit.FileRecord = Ext.data.Record.create([
        { name: 'name', mapping: 'name' },
        { name: 'size', mapping: 'size' },
        { name: 'parentPath', mapping: 'parentPath' }
        
    ]);
    
    //Store for uploaded file details
    var uploadedFilesStore = new Ext.data.SimpleStore({
        fields: [
            { name: 'name', type: 'string' },
            { name: 'size', type: 'int' },
            { name: 'parentPath', type: 'string' }
        ]
    });

    // callback for the create series/select series radio buttons
    var onSwitchCreateSelect = function(checkbox, checked) {
        if (checked) {
            var combo = Ext.getCmp('seriesCombo');
            var descText = Ext.getCmp('seriesDesc');
            combo.reset();
            combo.setEditable(false);
            combo.getStore().reload();
            descText.setDisabled(true);
            descText.reset();
        } else {
            var combo = Ext.getCmp('seriesCombo');
            var descText = Ext.getCmp('seriesDesc');
            combo.reset();
            combo.setEditable(true);
            combo.getStore().removeAll();
            descText.setDisabled(false);
            descText.reset();
        }
    };

    var seriesForm = new Ext.FormPanel({
        bodyStyle: 'padding:10px;',
        id: 'seriesForm',
        frame: true,
        defaults: { anchor: "100%" },
        monitorValid: true,
        items: [{
            xtype: 'label',
            text: 'A grid job is always part of a job series even if it is a single job. Please specify if you want to create a new series for this job or add it to an existing one:'
        }, {
            xtype: 'radiogroup',
            style: 'padding:10px;',
            hideLabel: true,
            items: [{
                name: 'sCreateSelect',
                id: 'selExistRadio',
                boxLabel: 'Select existing series',
                inputValue: 0,
                checked: true,
                handler: onSwitchCreateSelect
            }, {
                name: 'sCreateSelect',
                id: 'createNewRadio',
                boxLabel: 'Create new series',
                inputValue: 1
            }]
        }, {
            xtype: 'fieldset',
            title: 'Series properties',
            collapsible: false,
            anchor: '100% -80',
            defaults: { anchor: '100%' },
            items: [{
                xtype: 'combo',
                id: 'seriesCombo',
                name: 'seriesName',
                editable: false,
                mode: 'local',
                minLength: 3,
                allowBlank: false,
                maskRe: /[^\W]/,
                store: mySeriesStore,
                triggerAction: 'all',
                displayField: 'name',
                tpl: '<tpl for="."><div ext:qtip="{description}" class="x-combo-list-item">{name}</div></tpl>',
                fieldLabel: 'Series Name'
            }, {
                xtype: 'textarea',
                id: 'seriesDesc',
                name: 'seriesDesc',
                anchor: '100% -30',
                disabled: true,
                fieldLabel: 'Description',
                blankText: 'Please provide a meaningful description...',
                allowBlank: false
            }]
        }]
    });

    Ext.getCmp('seriesCombo').on({
        'select': function(combo, record, index) {
            var descArea = Ext.getCmp('seriesDesc');
            descArea.setRawValue(record.get('description'));
            GridSubmit.seriesId = record.get('id');
        }
    });

    var jobObjectForm = new Ext.FormPanel({
        bodyStyle: 'padding:10px;',
        id: 'jobObjectForm',
        frame: true,
        defaults: { anchor: "100%" },
        labelWidth: 150,
        autoScroll: true,
        items: [{
            xtype: 'textfield',
            name: 'ec2Endpoint',
            fieldLabel: 'EC2 Endpoint',
            readOnly : true
        }, {
            xtype: 'textfield',
            name: 'ec2AMI',
            fieldLabel: 'EC2 Machine Instance',
            readOnly : true
        },{
            xtype: 'textfield',
            name: 'name',
            fieldLabel: 'Job Name',
            emptyText : 'Enter an optional descriptive name for your job here.',
            allowBlank: true
        },{
            xtype: 'textfield',
            name: 'description',
            fieldLabel: 'Job Description',
            emptyText : 'Enter an optional description for your job here.',
            allowBlank: true
        },{
            xtype: 'textfield',
            id: 's3OutputBucket',
            name: 's3OutputBucket',
            emptyText: 'Enter an Amazon S3 bucket where your job results will be stored',
            fieldLabel: 'S3 Bucket',
            value : 'vegl-portal',
            allowBlank: false
        },{
            xtype: 'textfield',
            id: 's3OutputAccessKey',
            name: 's3OutputAccessKey',
            emptyText: 'Enter an Amazon S3 access key that will be used to store your job outputs',
            fieldLabel: 'S3 Access Key',
            allowBlank: false
        }, {
            xtype: 'textfield',
            id: 's3OutputSecretKey',
            name: 's3OutputSecretKey',
            inputType: 'password',
            fieldLabel: 'S3 Secret Key',
            allowBlank: false
        },
        { xtype: 'hidden', name: 'id' },
        { xtype: 'hidden', name: 'emailAddress' },
        { xtype: 'hidden', name: 'user' },
        { xtype: 'hidden', name: 'submitDate' },
        { xtype: 'hidden', name: 'status' },
        { xtype: 'hidden', name: 'ec2InstanceId' },
        { xtype: 'hidden', name: 's3OutputBaseKey' },
        { xtype: 'hidden', name: 'fileStorageId' },
        { xtype: 'hidden', name: 'registeredUrl' }
        ]
    });
    
    var gotoStep = function(newStep) {
        var layout = Ext.getCmp('jobwizard-panel').getLayout();
        layout.setActiveItem(newStep);
        //added code for common upload handling in here.
    };

    var validateSeries = function() {
        if (Ext.getCmp('selExistRadio').getGroupValue() == 0) {
            if (Ext.isEmpty(GridSubmit.seriesId)) {
                Ext.Msg.alert('No series selected',
                    'Please select a series to add the new job to.');
                return false;
            }
        } else {
            GridSubmit.seriesId = undefined;
            GridSubmit.seriesName = Ext.getCmp('seriesCombo').getRawValue();
            GridSubmit.seriesDesc = Ext.getCmp('seriesDesc').getRawValue();
            if (Ext.isEmpty(GridSubmit.seriesName) ||
                    Ext.isEmpty(GridSubmit.seriesDesc)) {
                Ext.Msg.alert('Create new series',
                    'Please specify a name and description for the new series.');
                return false;
            }
        }
        gotoStep(1);
        return true;
    };

    var validateStorageForm = function(newStep) {
    	if (s3StorageForm.getForm().isValid()) {
    		gotoStep(newStep);
    		return true;
    	} else {
    		Ext.Msg.alert('Invalid value(s)', 'Please provide values for all fields.');
            return false;
    	}
    };
    
    //newStep: An integer that represents the next form to in list to open (if form validation succeeds)
    //onSuccessfulValidation : [Optional] a function that will be called after form validation but before the form changes 
    var validateMetadata = function(newStep, onSuccesfulValidation) {
    	if (newStep==0 || true) {    	    
    	    if (onSuccesfulValidation)
    	    	onSuccesfulValidation();
            gotoStep(newStep);
            return true;
        } else {
            Ext.Msg.alert('Invalid value(s)', 'Please provide values for all fields.');
            return false;
        }
    };

    var uploadAction = new Ext.Action({
        text: 'Upload File',
        disabled: false,
        iconCls: 'disk-icon',
        handler: GridSubmit.uploadFile
    });

    var deleteAction = new Ext.Action({
        id: 'delete-files-btn',
        text: 'Delete Selection',
        disabled: true,
        iconCls: 'cross-icon',
        handler: GridSubmit.deleteFiles
    });
    
    var downloadAction = new Ext.Action({
        text: 'Download',
        disabled: true,
        iconCls: 'disk-icon',
        handler: function() {
            //var jobData = fileGrid.getSelectionModel().getSelected().data;
            GridSubmit.downloadFile();
        }
    });
    
    var fileGrid = new Ext.grid.GridPanel({
        id: 'file-grid',
        title: 'Uploaded files',
        store: uploadedFilesStore,
        stripeRows: true,
        anchor: '100% -20',
        columns: [
            { header: 'Filename', width: 200, sortable: true, dataIndex: 'name' },
            { header: 'Size', width: 100, sortable: true, dataIndex: 'size',
                renderer: Ext.util.Format.fileSize, align: 'right' }
        ],
        sm: new Ext.grid.RowSelectionModel({
            singleSelect: false,
            listeners: {
                'selectionchange': function(sm) {
                    if (fileGrid.getSelectionModel().getCount() == 0) {
                        deleteAction.setDisabled(true);
                        downloadAction.setDisabled(true);
                    } else {
                        deleteAction.setDisabled(false);
                        downloadAction.setDisabled(false);
                    }
                }
            }

        })
    });
    
    var fileRetrievalMessage = new Ext.form.Label({
    	xtype: 'label',
    	text:'Retrieving files... ',
    	style: 'font-weight:bold;',
    	id: 'fileRetrievalMessage'
    });
        
    var filesForm = new Ext.FormPanel({
        bodyStyle: 'padding:10px;',
        id: 'filesForm',
        fileUpload: true,
        frame: true,
        labelWidth: 150,
        buttons: [
            uploadAction,
            deleteAction,
            downloadAction
        ],
        items: [{
            anchor: '100%',
            xtype: 'label',
            id: 'statusArea',
            name: 'jobStatus',
            style: 'font-weight:bold;',
            text : ''
        },{
            anchor: '100%',
            xtype: 'textfield',
            id: 'fileInputField',
            name: 'file',
            inputType: 'file',
            allowBlank: false,
            fieldLabel: 'Select File to upload'
        },
        	fileRetrievalMessage
        ,
            fileGrid
        ]
    });

    var jobWizard = {
        id: 'jobwizard-panel',
        layout: 'card',
        activeItem: 0,
        defaults: { layout:'fit', frame: true, buttonAlign: 'right' },
        items: [{
            id: 'card-series',
            title: 'Step 1: Choose a job series...',
            defaults: { border: false },
            buttons: [{
                text: 'Next &raquo;',
                handler: validateSeries
            }],
            items: [ seriesForm ]
        }, {
            id: 'card-job',
            title: 'Step 2: Enter job details...',
            defaults: { border: false },
            buttons: [{
                text: '&laquo; Previous',
                handler: validateMetadata.createDelegate(this, [0])
            }, {
                text: 'Next &raquo;',
                handler: validateMetadata.createDelegate(this, [2])
            }],
            items: [ jobObjectForm ]
        }, {
            id: 'card-files',
            title: 'Step 3: Add files to job...',
            defaults: { border: false },
            buttons: [{
                text: '&laquo; Previous',
                handler: validateMetadata.createDelegate(this, [1])
            }, {
                text: 'Submit',
                handler: GridSubmit.submitJob
            }],
            items: [ filesForm ]
        }]
    };

    new Ext.Viewport({
        layout: 'border',
        items: [{
            xtype: 'box',
            region: 'north',
            applyTo: 'body',
            height: 100
        },{
            id: 'job-submit-panel',
            title: 'Submit a simulation job',
            region: 'center',
            margins: '2 2 2 0',
            layout: 'fit',
            bodyStyle: 'padding:20px 200px;',
            buttons: [{
                id: 'cancelBtn',
                text: 'Cancel',
                handler: GridSubmit.confirmCancel
            }],
            items: [ jobWizard ]
        }]
    });

    // Avoid accidentally navigating away from this page
    Ext.EventManager.on(window, 'beforeunload',
            GridSubmit.onWindowUnloading, GridSubmit);
    
    GridSubmit.loadJobObject();
};


Ext.onReady(GridSubmit.initialize);

