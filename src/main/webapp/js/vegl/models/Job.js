/**
 * A job is a collection of all input/processing/output information describing a single unit of work
 * within the VL workflow
 */
Ext.define('vegl.models.Job', {
    extend: 'Ext.data.Model',

    statics : {
        STATUS_FAILED : "Failed",
        STATUS_ACTIVE : "Active",
        STATUS_PENDING : "Pending",
        STATUS_DONE : "Done",
        STATUS_CANCELLED : "Cancelled",
        STATUS_UNSUBMITTED : "Saved",
        STATUS_INQUEUE : "In Queue",
        STATUS_ERROR : "ERROR"
    },

    fields: [
        { name: 'id', type: 'int' }, //Unique identifier for the series
        { name: 'name', type: 'string' }, //Descriptive name of the series
        { name: 'description', type: 'string' }, //Long description of the series
        { name: 'emailAddress', type: 'string'}, //Email who created this series
        { name: 'user', type: 'string'}, //Username who created this series
        { name: 'submitDate', type: 'date', convert: function(value, record) {
            if (!value) {
                return null;
            } else {
                return new Date(value.time);
            }
        }}, //When this job was submitted to the cloud
        { name: 'processTimeLog', type: 'String'},
        { name: 'status', type: 'string'}, //The status of the job

        { name: 'computeVmId', type: 'string'}, //the ID of the VM that will be used to run this job
        { name: 'computeInstanceId', type: 'string'}, //the ID of the VM instance that is running this job (will be null if no job is currently running)
        { name: 'computeInstanceType', type: 'string'}, //The type of the compute instance to start (size of memory, number of CPUs etc) - eg m1.large. Can be null
        { name: 'computeInstanceKey', type: 'string'}, //The name of the key to inject into the instance at startup for root access. Can be null
        { name: 'computeServiceId', type: 'string'}, //The ID of the compute service used to execute this job

        { name: 'storageServiceId', type: 'string'}, //The ID of the storage service used to store this job's input/outputs
        { name: 'storageBaseKey', type: 'string'}, //The key prefix for all files associated with this job in the specified storage bucket

        { name: 'registeredUrl', type: 'string'},
        { name: 'seriesId', type: 'int'},
        { name: 'jobParameters', type: 'auto', convert: function(value, record) { //an array of vegl.models.Parameter objects
            if (!value) {
                return [];
            } else {
                var paramList = [];
                for (var key in value) {
                    paramList.push(Ext.create('vegl.models.Parameter', value[key]));
                }
                return paramList;
            }
        }},
        { name: 'jobDownloads', type: 'auto', convert: function(value, record) { //an array of vegl.models.Download objects
            if (!value) {
                return [];
            } else {
                var paramList = [];
                for (var i = 0; i < value.length; i++) {
                    if (value[i] instanceof vegl.models.Download) {
                        paramList.push(value[i]);
                    } else {
                        paramList.push(Ext.create('vegl.models.Download', value[i]));
                    }
                }
                return paramList;
            }
        }}
    ],

    /**
     * Gets the set of Parameters associated with this job encoded as a Key/Value encoded object.
     *
     * This object is readonly, changes made to it will NOT affect this Job object
     */
    getJobParametersObject : function() {
        var obj = {};
        var params = this.get('jobParameters');
        for (var i = 0; i < jobParameters.length; i++) {
            obj[params[i].get('name')] = params[i].get('value');
        }

        return obj;
    }
});