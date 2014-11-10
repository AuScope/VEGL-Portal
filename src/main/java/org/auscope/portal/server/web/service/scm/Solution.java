package org.auscope.portal.server.web.service.scm;

import java.util.Date;
import java.util.List;
import java.util.Map;

import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.annotate.JsonProperty;
import org.springframework.web.client.RestTemplate;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Solution {
    private String id;
    private String name;
    private String description;
    private Date createdAt;
    private String template;
    private Toolbox toolbox;
    private List<Map<String, String>> dependencies;
    // Ignore variables - don't care about them server-side

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
     * @return the template
     */
    public String getTemplate() {
        return template;
    }
    /**
     * @param template the template to set
     */
    public void setTemplate(String template) {
        this.template = template;
    }

    /**
     * @return the toolbox
     */
    public Toolbox getToolbox() {
        return toolbox;
    }

    /**
     * Return the Toolbox, ensuring full details if full is true.
     *
     * @param full Ensure full details are availble if true
     * @return the toolbox
     */
    public Toolbox getToolbox(boolean full) {
        ensureToolbox();
        return toolbox;
    }

    /**
     * @param toolbox the toolbox to set
     */
    public void setToolbox(Toolbox toolbox) {
        this.toolbox = toolbox;
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

    /**
     * Ensures full Toolbox details have been fetched.
     */
    public void ensureToolbox() {
        // Only fetch the toolbox detail if we haven't already
        if (this.toolbox.getSource() == null) {
            RestTemplate rest = new RestTemplate();
            Toolbox toolbox = rest.getForObject(this.toolbox.getId(),
                                                Toolbox.class);
            setToolbox(toolbox);
        }
    }
}
