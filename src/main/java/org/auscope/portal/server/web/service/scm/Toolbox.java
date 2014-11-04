package org.auscope.portal.server.web.service.scm;

import java.util.Date;
import java.util.List;
import java.util.Map;

import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.annotate.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Toolbox {
    private String id;
    private String name;
    private String description;
    private Date createdAt;
    private Map<String, String> source;
    private List<Map<String, String>> dependencies;

    @JsonProperty("@id")
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @JsonProperty("created_at")
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

    /**
     * @return the name
     */
    public String getName() {
        return name;
    }
    /**
     * @param name the name to set
     */
    public void setName(String name) {
        this.name = name;
    }
    /**
     * @return the description
     */
    public String getDescription() {
        return description;
    }
    /**
     * @param description the description to set
     */
    public void setDescription(String description) {
        this.description = description;
    }
    /**
     * @return the source
     */
    public Map<String, String> getSource() {
        return source;
    }
    /**
     * @param source the source to set
     */
    public void setSource(Map<String, String> source) {
        this.source = source;
    }
    /**
     * @return the dependencies
     */
    public List<Map<String, String>> getDependencies() {
        return dependencies;
    }
    /**
     * @param dependencies the dependencies to set
     */
    public void setDependencies(List<Map<String, String>> dependencies) {
        this.dependencies = dependencies;
    }
}
