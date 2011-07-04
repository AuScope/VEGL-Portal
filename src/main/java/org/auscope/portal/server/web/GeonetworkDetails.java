package org.auscope.portal.server.web;

/**
 * A POJO for storing geonetwork credentials and URL's for usage by any code
 * that intends to WRITE to genetwork
 * @author Josh Vote
 *
 */
public class GeonetworkDetails {
	private String url;
	private String user;
	private String password;
	
	public GeonetworkDetails() {
		this("", "", "");
	}
	public GeonetworkDetails(String url, String user, String password) {
		super();
		this.url = url;
		this.user = user;
		this.password = password;
	}
	public String getUrl() {
		return url;
	}
	
	public void setUrl(String url) {
		this.url = url;
	}
	
	public String getUser() {
		return user;
	}
	
	public void setUser(String user) {
		this.user = user;
	}
	
	public String getPassword() {
		return password;
	}
	
	public void setPassword(String password) {
		this.password = password;
	}
	
	
}
