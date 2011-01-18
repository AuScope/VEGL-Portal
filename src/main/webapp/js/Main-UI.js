//this runs on DOM load - you can access all the good stuff now.
var theglobalexml;
//var host = "http://localhost:8080";
//Ext.Ajax.timeout = 180000; //3 minute timeout for ajax calls

//A global instance of GMapInfoWindowManager that helps to open GMap info windows
var mapInfoWindowManager = null;

Ext.onReady(function() {
    var map;
    var formFactory = new FormFactory();
    var searchBarThreshold = 6; //how many records do we need to have before we show a search bar

    //Generate our data stores
    var cswRecordStore = new CSWRecordStore('getCSWRecords.do');
    var knownLayersStore = new KnownLayerStore('getKnownLayers.do');
    var customLayersStore = new CSWRecordStore('getCustomLayers.do');
    var activeLayersStore = new ActiveLayersStore();

    //Called whenever any of the KnownLayer panels click 'Add to Map'
    var knownLayerAddHandler = function(knownLayer) {
        var activeLayerRec = activeLayersStore.getByKnownLayerRecord(knownLayer);

        //Only add if the record isn't already there
        if (!activeLayerRec) {
            //add to active layers (At the top of the Z-order)
        	activeLayerRec = activeLayersStore.addKnownLayer(knownLayer, cswRecordStore);

            //invoke this layer as being checked
            activeLayerCheckHandler(activeLayerRec, true);
        }

        //set this record to selected
        activeLayersPanel.getSelectionModel().selectRecords([activeLayerRec.internalRecord], false);
    };

    //Called whenever any of the CSWPanels click 'Add to Map'
    var cswPanelAddHandler = function(cswRecord) {
        var activeLayerRec = activeLayersStore.getByCSWRecord(cswRecord);

        //Only add if the record isn't already there
        if (!activeLayerRec) {
            //add to active layers (At the top of the Z-order)
        	activeLayerRec = activeLayersStore.addCSWRecord(cswRecord);

            //invoke this layer as being checked
            activeLayerCheckHandler(activeLayerRec, true);
        }

        //set this record to selected
        activeLayersPanel.getSelectionModel().selectRecords([activeLayerRec.internalRecord], false);
    };

    //Returns true if the CSWRecord record intersects the GMap viewport (based on its bounding box)
    var visibleCSWRecordFilter = function(record) {
    	var geoEls = record.getGeographicElements();
    	var visibleBounds = map.getBounds();

		//Iterate every 'bbox' geographic element type looking for an intersection
		//(They will be instances of the BBox class)
		for (var j = 0; j < geoEls.length; j++) {
			var bbox = geoEls[j];

			var sw = new GLatLng(bbox.southBoundLatitude, bbox.westBoundLongitude);
	    	var ne = new GLatLng(bbox.northBoundLatitude, bbox.eastBoundLongitude);
	    	var bboxBounds = new GLatLngBounds(sw,ne);

	    	if (visibleBounds.intersects(bboxBounds)) {
	    		return true;
	    	}
		}
    };

    //Returns true if the current records (from the knownLayersStore)
    //intersects the GMap viewport (based on its bounding box)
    //false otherwise
    var visibleKnownLayersFilter = function(record) {
    	var linkedCSWRecords = record.getLinkedCSWRecords(cswRecordStore);
    	var visibleBounds = map.getBounds();

    	//iterate over every CSWRecord that makes up this layer, look for
    	//one whose reported bounds intersects the view port
		for (var i = 0; i < linkedCSWRecords.length; i++) {
			if (visibleCSWRecordFilter(linkedCSWRecords[i])) {
				return true;
			}
		}

		return false;
    };

    //Given a CSWRecord, show (on the map) the list of bboxes associated with that record temporarily
    //bboxOverlayManager - if specified, will be used to store the overlays, otherwise the cswRecord's
    //                      bboxOverlayManager will be used
    var showBoundsCSWRecord = function(cswRecord, bboxOverlayManager) {
    	var geoEls = cswRecord.getGeographicElements();

    	if (!bboxOverlayManager) {
	    	bboxOverlayManager = cswRecord.getBboxOverlayManager();
	    	if (bboxOverlayManager) {
	    		bboxOverlayManager.clearOverlays();
	    	} else {
	    		bboxOverlayManager = new OverlayManager(map);
	    		cswRecord.setBboxOverlayManager(bboxOverlayManager);
	    	}
    	}

    	//Iterate our geographic els to get our list of bboxes
    	for (var i = 0; i < geoEls.length; i++) {
    		var geoEl = geoEls[i];
    		if (geoEl instanceof BBox) {
    			var polygonList = geoEl.toGMapPolygon('00FF00', 0, 0.7,'#00FF00', 0.6);

        	    for (var j = 0; j < polygonList.length; j++) {
        	    	polygonList[j].title = 'bbox';
        	    	bboxOverlayManager.addOverlay(polygonList[j]);
        	    }
    		}
    	}

    	//Make the bbox disappear after a short while
    	var clearTask = new Ext.util.DelayedTask(function(){
    		bboxOverlayManager.clearOverlays();
    	});

    	clearTask.delay(2000);
    };

    //Pans/Zooms the map so the specified BBox object is visible
    var moveMapToBounds = function(bbox) {
    	var sw = new GLatLng(bbox.southBoundLatitude, bbox.westBoundLongitude);
    	var ne = new GLatLng(bbox.northBoundLatitude, bbox.eastBoundLongitude);
    	var layerBounds = new GLatLngBounds(sw,ne);

    	//Adjust zoom if required
    	var visibleBounds = map.getBounds();
    	map.setZoom(map.getBoundsZoomLevel(layerBounds));

    	//Pan to position
    	var layerCenter = layerBounds.getCenter();
    	map.panTo(layerCenter);
    };

    //Pans the map so that all bboxes linked to this record are visible.
    //If currentBounds is specified
    var moveToBoundsCSWRecord = function(cswRecord) {
    	var bboxExtent = cswRecord.generateGeographicExtent();

    	if (!bboxExtent) {
    		return;
    	}

    	moveMapToBounds(bboxExtent);
    };

    //Given a KnownLayer, show (on the map) the list of bboxes associated with that layer temporarily
    var showBoundsKnownLayer = function(knownLayer) {
    	var bboxOverlayManager = knownLayer.getBboxOverlayManager();
    	if (bboxOverlayManager) {
    		bboxOverlayManager.clearOverlays();
    	} else {
    		bboxOverlayManager = new OverlayManager(map);
    		knownLayer.setBboxOverlayManager(bboxOverlayManager);
    	}

    	var linkedRecords = knownLayer.getLinkedCSWRecords(cswRecordStore);
    	for (var i = 0; i < linkedRecords.length; i++) {
    		showBoundsCSWRecord(linkedRecords[i], bboxOverlayManager);
    	}
    };

    var moveToBoundsKnownLayer = function(knownLayer) {
    	var linkedRecords = knownLayer.getLinkedCSWRecords(cswRecordStore);
    	var superBbox = null;
    	for (var i = 0; i < linkedRecords.length; i++) {
    		var bboxToCombine =  linkedRecords[i].generateGeographicExtent();
    		if (bboxToCombine != null) {
	    		if (superBbox == null) {
	    			superBbox = bboxToCombine;
	    		} else {
	    			superBbox = superBbox.combine(bboxToCombine);
	    		}
    		}
    	}

    	if (superBbox) {
    		moveMapToBounds(superBbox);
    	}
    };

    //Iterates through the list of Known Layers looking for layers that 'own' this record
    var getParentKnownLayers = function(cswRecord) {
    	var knownLayers = [];

    	knownLayersStore.each(function(rec) {
    		var knownLayer = new KnownLayerRecord(rec);

    		var childRecords = knownLayer.getLinkedCSWRecords(cswRecordStore);
    		for (var i = 0; i < childRecords.length; i++) {
    			if (childRecords[i].getFileIdentifier() === cswRecord.getFileIdentifier()) {
    				knownLayers.push(knownLayer);
    			}
    		}
    	});

    	return knownLayers;
    };

    //-----------Known Features Panel Configurations (Groupings of various CSWRecords)
    var knownLayersPanel = new KnownLayerGridPanel('kft-layers-panel',
												    		'Featured Layers',
												    		knownLayersStore,
												    		cswRecordStore,
												    		knownLayerAddHandler,
												    		visibleKnownLayersFilter,
												    		showBoundsKnownLayer,
												    		moveToBoundsKnownLayer);

    //----------- Map Layers Panel Configurations (Drawn from CSWRecords that aren't a KnownLayer)
    var mapLayersFilter = function(cswRecord) {
    	var serviceName = cswRecord.getServiceName();
    	if (!serviceName || serviceName.length == 0) {
    		return false;
    	}

    	//ensure its not referenced via KnownLayer
    	var knownLayers = getParentKnownLayers(cswRecord);
    	return knownLayers.length == 0;
    };
    var mapLayersPanel = new CSWRecordGridPanel('wms-layers-panel',
									    		'Map Layers',
									    		cswRecordStore,
									    		cswPanelAddHandler,
									    		mapLayersFilter,
									    		visibleCSWRecordFilter,
									    		showBoundsCSWRecord,
									    		moveToBoundsCSWRecord);



    //------ Custom Layers
    var customLayersPanel = new CustomLayersGridPanel('custom-layers-panel',
										    		'Custom Layers',
										    		customLayersStore,
										    		cswPanelAddHandler,
										    		showBoundsCSWRecord,
										    		moveToBoundsCSWRecord);

    //Returns an object
    //{
    //    bboxSrs : 'EPSG:4326'
    //    lowerCornerPoints : [numbers]
    //    upperCornerPoints : [numbers]
    //}
    var fetchVisibleMapBounds = function(gMapInstance) {
    	var mapBounds = gMapInstance.getBounds();
		var sw = mapBounds.getSouthWest();
		var ne = mapBounds.getNorthEast();
		var center = mapBounds.getCenter();

		var adjustedSWLng = sw.lng();
		var adjustedNELng = ne.lng();

		//this is so we can fetch data when our bbox is crossing the anti meridian
		//Otherwise our bbox wraps around the WRONG side of the planet
		if (adjustedSWLng <= 0 && adjustedNELng >= 0 ||
			adjustedSWLng >= 0 && adjustedNELng <= 0) {
			adjustedSWLng = (sw.lng() < 0) ? (180 - sw.lng()) : sw.lng();
			adjustedNELng = (ne.lng() < 0) ? (180 - ne.lng()) : ne.lng();
		}

		return {
				bboxSrs : 'EPSG:4326',
				lowerCornerPoints : [Math.min(adjustedSWLng, adjustedNELng), Math.min(sw.lat(), ne.lat())],
				upperCornerPoints : [Math.max(adjustedSWLng, adjustedNELng), Math.max(sw.lat(), ne.lat())]
		};
    };

    var filterButton = new Ext.Button({
        text     :'Apply Filter >>',
        tooltip  :'Apply Filter',
        disabled : true,
        handler  : function() {
            var activeLayerRecord = new ActiveLayersRecord(activeLayersPanel.getSelectionModel().getSelected());
            loadLayer(activeLayerRecord);
        }
    });

    /**
     * Used to show extra details for querying services
     */
    var filterPanel = new Ext.Panel({
        title: "Filter Properties",
        region: 'south',
        split: true,
        layout: 'card',
        activeItem: 0,
        height: 200,
        autoScroll  : true,
        layoutConfig: {
            layoutOnCardChange: true// Important when not specifying an items array
        },
        items: [
            {
                html: '<p style="margin:15px;padding:15px;border:1px dotted #999;color:#555;background: #f9f9f9;"> Filter options will be shown here for special services.</p>'
            }
        ],
        bbar: ['->', filterButton]
    });

    /**
     *Iterates through the activeLayersStore and updates each WMS layer's Z-Order to is position within the store
     *
     *This function will refresh every WMS layer too
     */
    var updateActiveLayerZOrder = function() {
        //Update the Z index for each WMS item in the store
        for (var i = 0; i < activeLayersStore.getCount(); i++) {
            var activeLayerRec = new ActiveLayersRecord(activeLayersStore.getAt(i));
            var overlayManager = activeLayerRec.getOverlayManager();

            if (overlayManager && activeLayerRec.getLayerVisible()) {
            	var newZOrder = activeLayersStore.getCount() - i;

            	overlayManager.updateZOrder(newZOrder);
            }
        }
    };

    //Loads the contents for the specified activeLayerRecord (applying any filtering too)
    var loadLayer = function(activeLayerRecord) {
    	var cswRecords = activeLayerRecord.getCSWRecords();

        //We simplify things by treating the record list as a single type of WFS, WCS or WMS
        //So lets find the first record with a type we can choose (Prioritise WFS -> WCS -> WMS)
        if (cswRecords.length > 0) {
        	var cswRecord = cswRecords[0];

        	if (cswRecord.getFilteredOnlineResources('WFS').length != 0) {
        		wfsHandler(activeLayerRecord);
        	} else if (cswRecord.getFilteredOnlineResources('WCS').length != 0) {
        		wcsHandler(activeLayerRecord);
        	} else if (cswRecord.getFilteredOnlineResources('WMS').length != 0) {
        		wmsHandler(activeLayerRecord);
        	} else {
        		genericRecordHandler(activeLayerRecord);
        	}
        }
    };


    /**
     *@param forceApplyFilter (Optional) if set AND isChecked is set AND this function has a filter panel, it will force the current filter to be loaded
     */
    var activeLayerCheckHandler = function(activeLayerRecord, isChecked, forceApplyFilter) {
        //set the record to be selected if checked
        activeLayersPanel.getSelectionModel().selectRecords([activeLayerRecord.internalRecord], false);

        if (activeLayerRecord.getIsLoading()) {
        	activeLayerRecord.setLayerVisible(!isChecked); //reverse selection
        	record.set('layerVisible', !isChecked); //reverse selection
            Ext.MessageBox.show({
                title: 'Please wait',
                msg: "There is an operation in process for this layer. Please wait until it is finished.",
                buttons: Ext.MessageBox.OK,
                animEl: 'mb9',
                icon: Ext.MessageBox.INFO
            });
            return;
        }
        
        //activeLayerRecord.set('layerVisible', isChecked);
        activeLayerRecord.setLayerVisible(isChecked);

        if (isChecked) {
        	var filterPanelObj = activeLayerRecord.getFilterPanel();

            //Create our filter panel if we haven't already
            if (!filterPanelObj) {
            	filterPanelObj = formFactory.getFilterForm(activeLayerRecord, map, cswRecordStore);
            	activeLayerRecord.setFilterPanel(filterPanelObj);
            }

            //If the filter panel already exists, this may be a case where we are retriggering visiblity
            //in which case just rerun the previous filter
            if (filterPanelObj.form && forceApplyFilter && !filterButton.disabled) {
                filterButton.handler();
            }

            //If there is a filter panel, show it
            if (filterPanelObj.form) {
            	filterPanel.add(filterPanelObj.form);
                filterPanel.getLayout().setActiveItem(activeLayerRecord.getId());
            }

            //if we enable the filter button we don't download the layer immediately (as the user will have to enter in filter params)
            if (filterPanelObj.supportsFiltering) {
                filterButton.enable();
                filterButton.toggle(true);
            } else {
            	//Otherwise the layer doesn't need filtering, just display it immediately
                loadLayer(activeLayerRecord);
            }
            filterPanel.doLayout();
        } else {
        	//Otherwise we are making the layer invisible, so clear any overlays
        	var overlayManager = activeLayerRecord.getOverlayManager();
        	if (overlayManager) {
        		overlayManager.clearOverlays();
        	}

            filterPanel.getLayout().setActiveItem(0);
            filterButton.disable();
        }
    };


    //This will attempt to render the record using only the csw record bounding boxes
    var genericRecordHandler = function(activeLayerRecord) {
    	//get our overlay manager (create if required)
    	var overlayManager = activeLayerRecord.getOverlayManager();
    	if (!overlayManager) {
    		overlayManager = new OverlayManager(map);
    		activeLayerRecord.setOverlayManager(overlayManager);
    	}
    	overlayManager.clearOverlays();

    	var responseTooltip = new ResponseTooltip();
    	activeLayerRecord.setResponseToolTip(responseTooltip);

    	var reportTitleFilter = '';
        var keywordFilter = '';
    	var filterObj = filterPanel.getLayout().activeItem.getForm().getValues();
    	
    	reportTitleFilter = filterObj.title;
        var regexp = /\*/;
        if(reportTitleFilter != '' && /^\w+/.test(reportTitleFilter)) {
        	var regexp = new RegExp(reportTitleFilter, "i");
        }

        if(filterObj.keyword != null) {
        	keywordFilter = filterObj.keyword;
        }

        //Get the list of bounding box polygons
        var cswRecords = activeLayerRecord.getCSWRecords();
        var knownLayer = activeLayerRecord.getParentKnownLayer();
        var numRecords = 0;
    	for (var i = 0; i < cswRecords.length; i++) {
    		if ((reportTitleFilter === '' || regexp.test(cswRecords[i].getServiceName()))
    				&& (keywordFilter === '' || cswRecords[i].containsKeyword(keywordFilter))) {
    			numRecords++;
    			var geoEls = cswRecords[i].getGeographicElements();

    			for (var j = 0; j < geoEls.length; j++) {
    	    		var geoEl = geoEls[j];
    	    		if (geoEl instanceof BBox) {
    	    			if(geoEl.eastBoundLongitude == geoEl.westBoundLongitude &&
    	    				geoEl.southBoundLatitude == geoEl.northBoundLatitude) {
    	    				//We only have a point  	                    
    	                    var point = new GLatLng(parseFloat(geoEl.southBoundLatitude),
    	                    		parseFloat(geoEl.eastBoundLongitude));
    	                      	                    
    	                	var icon = new GIcon(G_DEFAULT_ICON, activeLayerRecord.getIconUrl());   
    	                	icon.shadow = null;
    	                	
	                		var iconSize = knownLayer.getIconSize();
	                		if (iconSize) {
	                			icon.iconSize = new GSize(iconSize.width, iconSize.height);
	                		}
	                		
	                		var iconAnchor = knownLayer.getIconAnchor();
	                		if(iconAnchor) {
	                        	icon.iconAnchor = new GPoint(iconAnchor.x, iconAnchor.y);
	                        }
    	                    
    	                    var marker = new GMarker(point, {icon: icon});
                            marker.activeLayerRecord = activeLayerRecord.internalRecord;
                            marker.cswRecord = cswRecords[i].internalRecord;
                            //marker.onlineResource = onlineResource;
                            
    	                    //Add our single point
    	                    overlayManager.markerManager.addMarker(marker, 0);
    	    		
    	    			} else { //polygon
	    	    			var polygonList = geoEl.toGMapPolygon('#0003F9', 4, 0.75,'#0055FE', 0.4);
	    	        	    
	    	        	    for (var k = 0; k < polygonList.length; k++) {
	    	        	    	polygonList[k].cswRecord = cswRecords[i].internalRecord;
	    	                	polygonList[k].activeLayerRecord = activeLayerRecord.internalRecord;
	    	        	    	
	    	        	    	overlayManager.addOverlay(polygonList[k]);
	    	        	    }
    	    			}
    	    		}
    	    	}
    		}
    	}
        overlayManager.markerManager.refresh();

    	responseTooltip.addResponse("", numRecords + " records retrieved.");
    };

    //The WCS handler will create a representation of a coverage on the map for a given WCS record
    //If we have a linked WMS url we should use that (otherwise we draw an ugly red bounding box)
    var wcsHandler = function(activeLayerRecord) {

    	//get our overlay manager (create if required)
    	var overlayManager = activeLayerRecord.getOverlayManager();
    	if (!overlayManager) {
    		overlayManager = new OverlayManager(map);
    		activeLayerRecord.setOverlayManager(overlayManager);
    	}

    	overlayManager.clearOverlays();

    	var responseTooltip = new ResponseTooltip();
    	activeLayerRecord.setResponseToolTip(responseTooltip);

    	//Attempt to handle each CSW record as a WCS (if possible).
    	var cswRecords = activeLayerRecord.getCSWRecordsWithType('WCS');
    	for (var i = 0; i < cswRecords.length; i++) {
    		var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');
    		var wcsOnlineResources = cswRecords[i].getFilteredOnlineResources('WCS');
    		var geographyEls = cswRecords[i].getGeographicElements();

    		//Assumption - We only contain a single WCS in a CSWRecord (although more would be possible)
    		var wcsOnlineResource = wcsOnlineResources[0];

    		if (geographyEls.length == 0) {
    			responseTooltip.addResponse(wcsOnlineResource.url, 'No bounding box has been specified for this coverage.');
    			continue;
    		}

    		//We will need to add the bounding box polygons regardless of whether we have a WMS service or not.
            //The difference is that we will make the "WMS" bounding box polygons transparent but still clickable
    		var polygonList = [];
    		for (var j = 0; j < geographyEls.length; j++) {
    			var thisPolygon = null;
    			if (wmsOnlineResources.length > 0) {
    				thisPolygon = geographyEls[j].toGMapPolygon('#000000', 0, 0.0,'#000000', 0.0);
    	        } else {
    	        	thisPolygon = geographyEls[j].toGMapPolygon('#FF0000', 0, 0.7,'#FF0000', 0.6);
    	        }

    			polygonList = polygonList.concat(thisPolygon);
    		}

    		//Add our overlays (they will be used for clicking so store some extra info)
    		for (var j = 0; j < polygonList.length; j++) {
    			polygonList[j].onlineResource = wcsOnlineResource;
            	polygonList[j].cswRecord = cswRecords[i].internalRecord;
            	polygonList[j].activeLayerRecord = activeLayerRecord.internalRecord;

            	overlayManager.addOverlay(polygonList[j]);
    		}

    		//Add our WMS tiles (if any)
            for (var j = 0; j < wmsOnlineResources.length; j++) {
            	var tileLayer = new GWMSTileLayer(map, new GCopyrightCollection(""), 1, 17);
                tileLayer.baseURL = wmsOnlineResources[j].url;
                tileLayer.layers = wmsOnlineResources[j].name;
                tileLayer.opacity = activeLayerRecord.getOpacity();

                overlayManager.addOverlay(new GTileLayerOverlay(tileLayer));
            }
    	}

    	//This will update the Z order of our WMS layers
        updateActiveLayerZOrder();
    };

    var wfsHandler = function(activeLayerRecord) {
        //if there is already a filter running for this record then don't call another
        if (activeLayerRecord.getIsLoading()) {
            Ext.MessageBox.show({
                title: 'Please wait',
                msg: "There is an operation in process for this layer. Please wait until it is finished.",
                buttons: Ext.MessageBox.OK,
                animEl: 'mb9',
                icon: Ext.MessageBox.INFO
            });
            return;
        }

        //Get our overlay manager (create if required).
        var overlayManager = activeLayerRecord.getOverlayManager();
        if (!overlayManager) {
        	overlayManager = new OverlayManager(map);
        	activeLayerRecord.setOverlayManager(overlayManager);
        }
        overlayManager.clearOverlays();

        //a response status holder
        var responseTooltip = new ResponseTooltip();
        activeLayerRecord.setResponseToolTip(responseTooltip);

        //Holds debug info
        var debuggerData = new DebuggerData();
        activeLayerRecord.setDebuggerData(debuggerData);

        //Prepare our query/locations
        var cswRecords = activeLayerRecord.getCSWRecordsWithType('WFS');
        var iconUrl = activeLayerRecord.getIconUrl();
        var finishedLoadingCounter = cswRecords.length;
        var parentKnownLayer = activeLayerRecord.getParentKnownLayer();

        //Begin loading from each service
        activeLayerRecord.setIsLoading(true);
        for (var i = 0; i < cswRecords.length; i++) {
        	//Assumption - We will only have 1 WFS linked per CSW
        	var wfsOnlineResource = cswRecords[i].getFilteredOnlineResources('WFS')[0];

        	//Generate our filter parameters for this service
        	var filterParameters = null;
            if (filterPanel.getLayout().activeItem == filterPanel.getComponent(0)) {
            	filterParameters = {typeName : wfsOnlineResource.name};
            } else {
            	filterParameters = filterPanel.getLayout().activeItem.getForm().getValues();
            }
            filterParameters.maxFeatures=200; // limit our feature request to 200 so we don't overwhelm the browser
        	filterParameters.bbox = Ext.util.JSON.encode(fetchVisibleMapBounds(map)); // This line activates bbox support AUS-1597
        	filterParameters.serviceUrl = wfsOnlineResource.url;
        	if (parentKnownLayer && parentKnownLayer.getDisableBboxFiltering()) {
        		filterParameters.bbox = null; //some WFS layer groupings may wish to disable bounding boxes
        	}

            handleQuery(activeLayerRecord, cswRecords[i], wfsOnlineResource, filterParameters, function() {
                //decrement the counter
                finishedLoadingCounter--;

                //check if we can set the status to finished
                if (finishedLoadingCounter <= 0) {
                	activeLayerRecord.setIsLoading(false);
                }
            });
        }
    };

    /**
     * internal helper method for Handling WFS filter queries via a proxyUrl and adding them to the map.
     */
    var handleQuery = function(activeLayerRecord, cswRecord, onlineResource, filterParameters, finishedLoadingHandler) {

    	var responseTooltip = activeLayerRecord.getResponseToolTip();
        responseTooltip.addResponse(filterParameters.serviceUrl, "Loading...");

        var debuggerData = activeLayerRecord.getDebuggerData();

        var knownLayer = activeLayerRecord.getParentKnownLayer();

        //If we don't have a proxy URL specified, use the generic 'getAllFeatures.do'
        var url = activeLayerRecord.getProxyUrl();
        if (!url) {
        	url = 'getAllFeatures.do';
        }

        Ext.Ajax.request({
        	url			: url,
        	params		: filterParameters,
        	timeout		: 1000 * 60 * 20, //20 minute timeout
        	failure		: function(response) {
        		responseTooltip.addResponse(filterParameters.serviceUrl, 'ERROR ' + response.status + ':' + response.statusText);
        		finishedLoadingHandler();
        	},
        	success		: function(response) {
        		var jsonResponse = Ext.util.JSON.decode(response.responseText);

        		if (jsonResponse.success) {
                	var icon = new GIcon(G_DEFAULT_ICON, activeLayerRecord.getIconUrl());

                	//Assumption - we are only interested in the first (if any) KnownLayer
                	if (knownLayer) {
                		var iconSize = knownLayer.getIconSize();
                		if (iconSize) {
                			icon.iconSize = new GSize(iconSize.width, iconSize.height);
                		}

                		var iconAnchor = knownLayer.getIconAnchor();
                		if(iconAnchor) {
                        	icon.iconAnchor = new GPoint(iconAnchor.x, iconAnchor.y);
                        }

                		var infoWindowAnchor = knownLayer.getInfoWindowAnchor();
                        if(infoWindowAnchor) {
                        	icon.infoWindowAnchor = new GPoint(infoWindowAnchor.x, infoWindowAnchor.y);
                        }
                	}

                	//TODO: This is a hack to remove marker shadows. Eventually it should be
                    // put into an external config file or become a session-based preference.
                	icon.shadow = null;

                    //Parse our KML
                    var parser = new KMLParser(jsonResponse.data.kml);
                    parser.makeMarkers(icon, function(marker) {
                        marker.activeLayerRecord = activeLayerRecord.internalRecord;
                        marker.cswRecord = cswRecord.internalRecord;
                        marker.onlineResource = onlineResource;
                    });

                    var markers = parser.markers;
                    var overlays = parser.overlays;

                    //Add our single points and overlays
                    var overlayManager = activeLayerRecord.getOverlayManager();
                    overlayManager.markerManager.addMarkers(markers, 0);
                    for(var i = 0; i < overlays.length; i++) {
                    	overlayManager.addOverlay(overlays[i]);
                    }
                    overlayManager.markerManager.refresh();

                    //Store some debug info
                    var debugInfo = jsonResponse.debugInfo.info;
                    debuggerData.addResponse(jsonResponse.debugInfo.url,debugInfo);

                    //store the status
                    responseTooltip.addResponse(filterParameters.serviceUrl, (markers.length + overlays.length) + " records retrieved.");
                } else {
                    //store the status
                	responseTooltip.addResponse(filterParameters.serviceUrl, jsonResponse.msg);
                    if(jsonResponse.debugInfo === undefined)
                    	debuggerData.addResponse(filterParameters.serviceUrl, jsonResponse.msg);
                    else
                    	debuggerData.addResponse(filterParameters.serviceUrl, jsonResponse.msg +jsonResponse.debugInfo.info);
                }

        		//we are finished
        		finishedLoadingHandler();
        	}
        });
    };

    var wmsHandler = function(activeLayerRecord) {

    	//Get our overlay manager (create if required).
        var overlayManager = activeLayerRecord.getOverlayManager();
        if (!overlayManager) {
        	overlayManager = new OverlayManager(map);
        	activeLayerRecord.setOverlayManager(overlayManager);
        }
        overlayManager.clearOverlays();

    	//Add each and every WMS we can find
    	var cswRecords = activeLayerRecord.getCSWRecordsWithType('WMS');
    	for (var i = 0; i < cswRecords.length; i++) {
    		var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');
    		for (var j = 0; j < wmsOnlineResources.length; j++) {
		        var tileLayer = new GWMSTileLayer(map, new GCopyrightCollection(""), 1, 17);
		        tileLayer.baseURL = wmsOnlineResources[j].url;
		        tileLayer.layers = wmsOnlineResources[j].name;
		        tileLayer.opacity = activeLayerRecord.getOpacity();

		        overlayManager.addOverlay(new GTileLayerOverlay(tileLayer));
    		}
    	}

    	//This will handle adding the WMS layer(s) (as well as updating the Z-Order)
        updateActiveLayerZOrder();
    };

    //This handler is called whenever the user selects an active layer
    var activeLayerSelectionHandler = function(activeLayerRecord) {
        //if its not checked then don't do any actions
        if (!activeLayerRecord.getLayerVisible()) {
            filterPanel.getLayout().setActiveItem(0);
            filterButton.disable();
        } else if (activeLayerRecord.getFilterPanel() != null) {
        	var filterPanelObj = activeLayerRecord.getFilterPanel();

            //if filter panel already exists then show it
        	if (filterPanelObj && filterPanelObj.form) {
        		filterPanel.getLayout().setActiveItem(activeLayerRecord.getId());
        	} else {
        		filterPanel.getLayout().setActiveItem(0);
        	}

            if (filterPanelObj.supportsFiltering) {
            	filterButton.disable();
            } else {
            	filterButton.disable();
            }
        } else {
            //if this type doesnt need a filter panel then just show the default filter panel
            filterPanel.getLayout().setActiveItem(0);
            filterButton.disable();
        }
    };


    //This handler is called on records that the user has requested to delete from the active layer list
    var activeLayersRemoveHandler = function(activeLayerRecord) {
        if (activeLayerRecord.getIsLoading()) {
            Ext.MessageBox.show({
                title: 'Please wait',
                msg: "There is an operation in process for this layer. Please wait until it is finished.",
                buttons: Ext.MessageBox.OK,
                animEl: 'mb9',
                icon: Ext.MessageBox.INFO
            });
            return;
        }

        var overlayManager = activeLayerRecord.getOverlayManager();
        if (overlayManager) {
        	overlayManager.clearOverlays();
        }

        //remove it from active layers
        activeLayersStore.removeActiveLayersRecord(activeLayerRecord);

        //set the filter panels active item to 0
        filterPanel.getLayout().setActiveItem(0);

        //Completely destroy the filter panel object as we no longer
        //have any use for it
        var filterPanelObj = activeLayerRecord.getFilterPanel();
        if (filterPanelObj && filterPanelObj.form) {
        	filterPanelObj.form.destroy();
        }
    };

    this.activeLayersPanel = new ActiveLayersGridPanel('active-layers-panel',
											    		'Active Layers',
											    		activeLayersStore,
											    		activeLayerSelectionHandler,
											    		updateActiveLayerZOrder,
											    		activeLayersRemoveHandler,
											    		activeLayerCheckHandler);

    /**
     * Tooltip for the active layers
     */
    var activeLayersToolTip = null;

    /**
     * Handler for mouse over events on the active layers panel, things like server status, and download buttons
     */
    this.activeLayersPanel.on('mouseover', function(e, t) {
        e.stopEvent();

        var row = e.getTarget('.x-grid3-row');
        var col = e.getTarget('.x-grid3-col');

        //if there is no visible tooltip then create one, if on is visible already we dont want to layer another one on top
        if (col != null && (activeLayersToolTip == null || !activeLayersToolTip.isVisible())) {

            //get the actual data record
            var theRow = activeLayersPanel.getView().findRow(row);
            var activeLayerRecord = new ActiveLayersRecord(activeLayersPanel.getStore().getAt(theRow.rowIndex));

            //This is for the key/legend column
            if (col.cellIndex == '1') {

            	if (activeLayerRecord.getCSWRecordsWithType('WMS').length > 0) {
	                activeLayersToolTip = new Ext.ToolTip({
	                    target: e.target ,
	                    autoHide : true,
	                    html: 'Show the key/legend for this layer' ,
	                    anchor: 'bottom',
	                    trackMouse: true,
	                    showDelay:60,
	                    autoHeight:true,
	                    autoWidth: true
	                });
            	}
            }
            //this is the status icon column
            else if (col.cellIndex == '2') {
                var html = 'No status has been recorded.';

                if (activeLayerRecord.getResponseToolTip() != null)
                    html = activeLayerRecord.getResponseToolTip().getHtml();

                activeLayersToolTip = new Ext.ToolTip({
                    target: e.target ,
                    title: 'Status Information',
                    autoHide : true,
                    html: html ,
                    anchor: 'bottom',
                    trackMouse: true,
                    showDelay:60,
                    autoHeight:true,
                    autoWidth: true
                });
            }
            //this is the column for download link icons
            else if (col.cellIndex == '5') {
                activeLayersToolTip = new Ext.ToolTip({
                    target: e.target ,
                    //title: 'Status Information',
                    autoHide : true,
                    html: 'Download data for this layer.' ,
                    anchor: 'bottom',
                    trackMouse: true,
                    showDelay:60,
                    autoHeight:true,
                    autoWidth: true
                });
            }
        }
    });

    /**
     * Handler for click events on the active layers panel, used for the
     * new browser window popup which shows the GML or WMS image
     */
    this.activeLayersPanel.on('click', function(e, t) {
        e.stopEvent();

        var row = e.getTarget('.x-grid3-row');
        var col = e.getTarget('.x-grid3-col');

        // if there is no visible tooltip then create one, if on is
        // visible already we don't want to layer another one on top
        if (col != null) {

            //get the actual data record
            var theRow = activeLayersPanel.getView().findRow(row);
            var activeLayerRecord = new ActiveLayersRecord(activeLayersPanel.getStore().getAt(theRow.rowIndex));

            //This is the marker key column
            if (col.cellIndex == '1') {
            	//For WMS, we request the Legend and display it
            	var cswRecords = activeLayerRecord.getCSWRecordsWithType('WMS');
            	if (cswRecords.length > 0) {

            		//Only show the legend window if it's not currently visible
            		var win = activeLayerRecord.getLegendWindow();
            		if (!win || (win && !win.isVisible())) {

            			//Generate a legend for each and every WMS linked to this record
            			var html = '';
            			var titleTypes = '';
            			for (var i = 0; i < cswRecords.length; i++) {
            				var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');
            				for (var j = 0; j < wmsOnlineResources.length; j++) {
			            		var url = new LegendManager(wmsOnlineResources[j].url, wmsOnlineResources[j].name).generateImageUrl();

			            		if (titleTypes.length != 0) {
			            			titleTypes += ', ';
			            		}
			            		titleTypes += wmsOnlineResources[j].name;

			            		html += '<a target="_blank" href="' + url + '">';
			            		html += '<img alt="Loading legend..." src="' + url + '"/>';
			            		html += '</a>';
			            		html += '<br/>';
            				}
            			}

	            		win = new Ext.Window({
	            			title		: 'Legend: ' + titleTypes,
	                        layout		: 'fit',
	                        width		: 200,
	                        height		: 300,

	                        items: [{
	                        	xtype 	: 'panel',
	                        	html	: html,
	                        	autoScroll	: true
	                        }]
	                    });

	            		//Save our window reference so we can tell if its already been open
	            		activeLayerRecord.setLegendWindow(win);

	            		win.show(e.getTarget());
            		} else if (win){
            			//The window is already open
            			win.toFront();
            			win.center();
            			win.focus();
            		}
            	}
            }
            //this is for clicking the loading icon
            else if (col.cellIndex == '2') {

	            //to get the value of variable used in url
            	function gup( name ) {
            		name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
            		var regexS = "[\\?&]"+name+"=([^&#]*)";
            		var regex = new RegExp( regexS );
            		var results = regex.exec( window.location.href );
            		if( results == null )
            			return "";
            		else
            		    return results[1];
            	}
            	var frank_param = gup( 'debug' );
            	//get the debug window if there is a debug variable with value 1
            	if(frank_param == 1){
		           	var debugHtml = 'Please generate a request to get the request query.';

		            if (activeLayerRecord.getDebuggerData()) {
		               	debugHtml = activeLayerRecord.getDebuggerData().getHtml();
		            }

			        var chkpanel = new Ext.Panel({
			           	autoScroll	: true,
	                    html	:	debugHtml
	    	        });
			        var debugWin = new Ext.Window({
			        	title: 'WFS Debug Information',
		               	layout:'fit',
		                width:500,
		                height:300,

	                    items: [chkpanel]
		            });

		            debugWin.show(this);
            	}

            }
            //this is the column for download link icons
            else if (col.cellIndex == '5') {
            	var keys = [];
                var values = [];

                //We simplify things by treating the record list as a single type of WFS, WCS or WMS
                //So lets find the first record with a type we can choose (Prioritise WFS -> WCS -> WMS)
                var cswRecords = activeLayerRecord.getCSWRecordsWithType('WFS');
                if (cswRecords.length != 0) {
                	for (var i = 0; i < cswRecords.length; i++) {
                		var wfsOnlineResources = cswRecords[i].getFilteredOnlineResources('WFS');

                		for (var j = 0; j < wfsOnlineResources.length; j++) {
                			var typeName = wfsOnlineResources[j].name;
                			var url = wfsOnlineResources[j].url;
                			var filterParameters = filterPanel.getLayout().activeItem == filterPanel.getComponent(0) ? "&typeName=" + typeName : filterPanel.getLayout().activeItem.getForm().getValues(true);

                			keys.push('serviceUrls');
                			values.push(window.location.protocol + "//" + window.location.host + WEB_CONTEXT + "/" + activeLayerRecord.getProxyUrl() + "?" + filterParameters + "&serviceUrl=" + url);
                		}
                	}

                    openWindowWithPost("downloadGMLAsZip.do?", 'WFS_Layer_Download_'+new Date().getTime(), keys, values);
                    return;
                }

                cswRecords = activeLayerRecord.getCSWRecordsWithType('WCS');
                if (cswRecords.length != 0) {
                	//Assumption - we only expect 1 WCS
            		var wcsOnlineResource = cswRecords[0].getFilteredOnlineResources('WCS')[0];
            		showWCSDownload(wcsOnlineResource.url, wcsOnlineResource.name);
            		return;
                }

                //For WMS we download every WMS
                cswRecords = activeLayerRecord.getCSWRecordsWithType('WMS');
                if (cswRecords.length != 0) {
                	for (var i = 0; i < cswRecords.length; i++) {
	                	var wmsOnlineResources = cswRecords[i].getFilteredOnlineResources('WMS');
	    				for (var j = 0; j < wmsOnlineResources.length; j++) {
	    					var boundBox = (map.getBounds().getSouthWest().lng() < 0 ? map.getBounds().getSouthWest().lng() + 360.0 : map.getBounds().getSouthWest().lng()) + "," +
	                        map.getBounds().getSouthWest().lat() + "," +
	                        (map.getBounds().getNorthEast().lng() < 0 ? map.getBounds().getNorthEast().lng() + 360.0 : map.getBounds().getNorthEast().lng()) + "," +
	                        map.getBounds().getNorthEast().lat();

					         var url = wmsOnlineResources[j].url;
					         var typeName = wmsOnlineResources[j].name;

					         var last_char = url.charAt(url.length - 1);
					         if ((last_char !== "?") && (last_char !== "&")) {
					             if (url.indexOf('?') == -1) {
					                 url += "?";
					             } else {
					                 url += "&";
					             }
					         }

					         url += "REQUEST=GetMap";
					         url += "&SERVICE=WMS";
					         url += "&VERSION=1.1.0";
					         url += "&LAYERS=" + typeName;
					         if (this.styles)
					             url += "&STYLES=" + this.styles;
					         else
					             url += "&STYLES="; //Styles parameter is mandatory, using a null string ensures default style
					         /*
					          if (this.sld)
					          url += "&SLD=" + this.sld;*/
					         url += "&FORMAT=" + "image/png";
					         url += "&BGCOLOR=0xFFFFFF";
					         url += "&TRANSPARENT=TRUE";
					         url += "&SRS=" + "EPSG:4326";
					         url += "&BBOX=" + boundBox;
					         url += "&WIDTH=" + map.getSize().width;
					         url += "&HEIGHT=" + map.getSize().height;

					         keys.push('serviceUrls');
					         values.push(url);
	    				}
	                }

                	openWindowWithPost("downloadWMSAsZip.do?", 'WMS_Layer_Download_'+new Date().getTime(), keys, values);
                	return;
                }
            }
        }
    });




    /**
     * Opens a new window to the specified URL and passes URL parameters like so keys[x]=values[x]
     *
     * @param {String} url
     * @param {String} name
     * @param {Array}  keys
     * @param {Array} values
     */

    var openWindowWithPost = function(url, name, keys, values)
    {
        if (keys && values && (keys.length == values.length)) {
            for (var i = 0; i < keys.length; i++) {
                url += '&' + keys[i] + '=' + escape(values[i]);
            }
        }
        downloadFile(url);
    };

    //downloads given specified file.
    downloadFile = function(url) {
        var body = Ext.getBody();
        var frame = body.createChild({
            tag:'iframe',
            cls:'x-hidden',
            id:'iframe',
            name:'iframe'
        });
        var form = body.createChild({
            tag:'form',
            cls:'x-hidden',
            id:'form',
            target:'iframe',
            method:'POST'
        });
        form.dom.action = url;
        form.dom.submit();
    };

    // basic tabs 1, built from existing content
    var tabsPanel = new Ext.TabPanel({
        //width:450,
        activeTab: 0,
        region:'north',
        split: true,
        height: 225,
        autoScroll: true,
        enableTabScroll: true,
        //autosize:true,
        items:[
            knownLayersPanel/*,
            mapLayersPanel,
            customLayersPanel*/
        ]
    });

    /**
     * Used as a placeholder for the tree and details panel on the left of screen
     */
    var westPanel = {
        layout: 'border',
        region:'west',
        border: false,
        split:true,
        //margins: '100 0 0 0',
        margins:'100 0 0 3',
        width: 350,
        items:[tabsPanel , activeLayersPanel, filterPanel]
    };

    /**
     * This center panel will hold the google maps
     */
    var centerPanel = new Ext.Panel({
        region: 'center',
        id: 'center_region',
        margins: '100 0 0 0',
        cmargins:'100 0 0 0'
    });

    /**
     * Add all the panels to the viewport
     */
    var viewport = new Ext.Viewport({
        layout:'border',
        items:[westPanel, centerPanel]
    });

    // Is user's browser suppported by Google Maps?
    if (GBrowserIsCompatible()) {

        map = new GMap2(centerPanel.body.dom);

        /* AUS-1526 search bar. */

        map.enableGoogleBar();
        /*
        // Problems, find out how to
        1. turn out advertising
        2. Narrow down location seraches to the current map view
                        (or Australia). Search for Albany retruns Albany, US
        */

        map.setUIToDefault();

        //add google earth
        map.addMapType(G_SATELLITE_3D_MAP);

        // Large pan and zoom control
        //map.addControl(new GLargeMapControl(),  new GControlPosition(G_ANCHOR_TOP_LEFT));

        // Toggle between Map, Satellite, and Hybrid types
        map.addControl(new GMapTypeControl());

        var startZoom = 4;
        map.setCenter(new google.maps.LatLng(-26, 133.3), startZoom);
        map.setMapType(G_SATELLITE_MAP);

        //Thumbnail map
        var Tsize = new GSize(150, 150);
        map.addControl(new GOverviewMapControl(Tsize));

        map.addControl(new DragZoomControl(), new GControlPosition(G_ANCHOR_TOP_RIGHT, new GSize(345, 7)));

        mapInfoWindowManager = new GMapInfoWindowManager(map);
    }

    // Fix for IE/Firefox resize problem (See issue AUS-1364 and AUS-1565 for more info)
    map.checkResize();
    centerPanel.on('resize', function() {
        map.checkResize();
    });

    //updateCSWRecords dud gloabal for geoxml class
    theglobalexml = new GeoXml("theglobalexml", map, null, null);

    //event handlers and listeners
    //tree.on('click', function(node, event) { treeNodeOnClickController(node, event, viewport, filterPanel); });
    //tree.on('checkchange', function(node, isChecked) { treeCheckChangeController(node, isChecked, map, statusBar, viewport, downloadUrls, filterPanel); });

    //when updateCSWRecords person clicks on updateCSWRecords marker then do something
    GEvent.addListener(map, "click", function(overlay, latlng, overlayLatlng) {
        gMapClickController(map, overlay, latlng, overlayLatlng, activeLayersStore);
    });

    GEvent.addListener(map, "mousemove", function(latlng){
        var latStr = "<b>Long:</b> " + latlng.lng().toFixed(6)
                   + "&nbsp&nbsp&nbsp&nbsp"
                   + "<b>Lat:</b> " + latlng.lat().toFixed(6);
    	document.getElementById("latlng").innerHTML = latStr;
    });

    GEvent.addListener(map, "mouseout", function(latlng){
        document.getElementById("latlng").innerHTML = "";
    });

    //As there is a relationship between these two stores,
    //We should refresh any GUI components whose view is dependent on these stores
    cswRecordStore.load({callback : function() {
    	knownLayersStore.fireEvent('datachanged');
    }});
    knownLayersStore.load({callback : function() {
    	cswRecordStore.fireEvent('datachanged');
    }});

});