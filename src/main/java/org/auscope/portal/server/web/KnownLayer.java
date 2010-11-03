package org.auscope.portal.server.web;

import java.io.Serializable;

/**
 * The abstract base class for all "Known Layers" to extend
 * @author vot002
 *
 */
public abstract class KnownLayer implements Serializable {
    protected String title;
    protected String description;
    protected String id;
    
    
    
    /**
     * @return the id
     */
    public String getId() {
        return id;
    }

    /**
     * @param id the id to set
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * Gets the human readable title of this layer
     * 
     * @return the title
     */
    public String getTitle() {
        return title;
    }
    
    /**
     * Sets the human readable title of this layer
     * @param title the title to set
     */
    public void setTitle(String title) {
        this.title = title;
    }
    
    /**
     * Gets the human readable description of this layer
     * @return the description
     */
    public String getDescription() {
        return description;
    }
    /**
     * Sets the human readable description of this layer
     * @param description the description to set
     */
    public void setDescription(String description) {
        this.description = description;
    }
    
    
    
    
}
