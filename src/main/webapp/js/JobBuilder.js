JobBuilder.onWindowUnloading = function(e) {
	e.browserEvent.returnValue = "All entered details will be lost!";
};

JobBuilder.initialise = function() {
	new Ext.Viewport({
        layout: 'border',
        items: [{
            xtype: 'box',
            region: 'north',
            applyTo: 'body',
            height: 100
        },{
            id: 'job-submit-panel',
            border : false,
            region: 'center',
            margins: '2 2 2 0',
            layout: 'fit',
            items: [ new JobWizard() ]
        }]
    });

    // Avoid accidentally navigating away from this page
    Ext.EventManager.on(window, 'beforeunload',
    		JobBuilder.onWindowUnloading, JobBuilder);
};

Ext.onReady(JobBuilder.initialise);