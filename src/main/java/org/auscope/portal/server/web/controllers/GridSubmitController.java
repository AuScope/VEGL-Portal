package org.auscope.portal.server.web.controllers;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import net.sf.json.JSONArray;
import net.sf.json.JSONObject;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.commons.ssl.Base64;
import org.auscope.portal.server.cloud.StagingInformation;
import org.auscope.portal.server.gridjob.FileInformation;
import org.auscope.portal.server.util.FileUtil;
import org.auscope.portal.server.util.PortalPropertyPlaceholderConfigurer;
import org.auscope.portal.server.vegl.VEGLJob;
import org.auscope.portal.server.vegl.VEGLJobManager;
import org.auscope.portal.server.vegl.VEGLSeries;
import org.auscope.portal.server.web.service.HttpServiceCaller;
import org.ietf.jgss.GSSCredential;
import org.ietf.jgss.GSSException;
import org.jets3t.service.impl.rest.httpclient.RestS3Service;
import org.jets3t.service.model.S3Bucket;
import org.jets3t.service.model.S3Object;
import org.jets3t.service.security.ProviderCredentials;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.servlet.ModelAndView;

import com.amazonaws.AmazonClientException;
import com.amazonaws.auth.AWSCredentials;
import com.amazonaws.services.ec2.AmazonEC2;
import com.amazonaws.services.ec2.AmazonEC2Client;
import com.amazonaws.services.ec2.model.Instance;
import com.amazonaws.services.ec2.model.RunInstancesRequest;
import com.amazonaws.services.ec2.model.RunInstancesResult;


/**
 * Controller for the job submission view.
 *
 * @author Cihan Altinay
 * @author Abdi Jama
 * @author Josh Vote
 */
@Controller
public class GridSubmitController {

    /** Logger for this class */
    private final Log logger = LogFactory.getLog(getClass());
    @Autowired
    private StagingInformation stagingInformation;
    @Autowired
    private VEGLJobManager jobManager;
    @Autowired
    private HttpServiceCaller serviceCaller;
    
    @Autowired
    @Qualifier(value = "propertyConfigurer")
    private PortalPropertyPlaceholderConfigurer hostConfigurer;

    //Grid File Transfer messages
    private static final String INTERNAL_ERROR= "Job submission failed due to INTERNAL ERROR";
    private static final String TRANSFER_COMPLETE = "Transfer Complete";
    
    // AWS error messages
    private static final String S3_FILE_COPY_ERROR = "Unable to upload file to S3 bucket, upload was aborted.";
    
    public static final String TABLE_DIR = "tables";
    public static final String PRE_STAGE_IN_TABLE_FILES = "/home/vegl-portal/tables/";
    public static final String FOR_ALL = "Common";
    
    /**
     * Returns a JSON object containing a populated VEGLJob object.
     *
     * @param request The servlet request
     * @param response The servlet response
     *
     * @return A JSON object with a data attribute containing a populated
     *         VEGLJob object and a success attribute.
     */
    @RequestMapping("/getJobObject.do")    
    public ModelAndView getJobObject(HttpServletRequest request,
                                     HttpServletResponse response) {

        VEGLJob job = prepareModel(request);

        logger.debug("Returning job.");
        ModelAndView result = new ModelAndView("jsonView");
        
        if(job == null){
            logger.error("Job setup failure.");
            result.addObject("success", false);
        }else{
            logger.debug("Job setup success.");
            result.addObject("data", job);
            result.addObject("success", true);
        }

        return result;
    }
    
    /**
     * Returns a JSON object containing an array of filenames and sizes which
     * are currently in the job's stage in directory.
     *
     * @param request The servlet request
     * @param response The servlet response
     *
     * @return A JSON object with a files attribute which is an array of
     *         filenames.
     */
    @RequestMapping("/listJobFiles.do")    
    public ModelAndView listJobFiles(HttpServletRequest request,
                                     HttpServletResponse response) {

        String jobInputDir = (String) request.getSession()
            .getAttribute("localJobInputDir");
        logger.debug("Inside listJobFiles.do");
        List<FileInformation> files = new ArrayList<FileInformation>();

        if (jobInputDir != null) {
	        String filePath = jobInputDir+GridSubmitController.TABLE_DIR;
	        File dir = new File(filePath+File.separator);
	        addFileNamesOfDirectory(files, dir, filePath);
        }

        logger.debug("Returning list of "+files.size()+" files.");
        return new ModelAndView("jsonView", "files", files);
    }

    /**
     * Sends the contents of a input job file to the client.
     *
     * @param request The servlet request including a filename parameter
     *                
     * @param response The servlet response receiving the data
     *
     * @return null on success or the joblist view with an error parameter on
     *         failure.
     */
    @RequestMapping("/downloadInputFile.do")
    public ModelAndView downloadFile(HttpServletRequest request,
                                     HttpServletResponse response) {

        String dirPathStr = request.getParameter("dirPath");
        String fileName = request.getParameter("filename");
        String errorString = null;
        
        if (dirPathStr != null && fileName != null) {
            logger.debug("Downloading: "+dirPathStr+File.separator+fileName+".");
            File f = new File(dirPathStr+File.separator+fileName);
            if (!f.canRead()) {
                logger.error("File "+f.getPath()+" not readable!");
                errorString = new String("File could not be read.");
            } else {
                response.setContentType("application/octet-stream");
                response.setHeader("Content-Disposition",
                        "attachment; filename=\""+fileName+"\"");

                try {
                    byte[] buffer = new byte[16384];
                    int count = 0;
                    OutputStream out = response.getOutputStream();
                    FileInputStream fin = new FileInputStream(f);
                    while ((count = fin.read(buffer)) != -1) {
                        out.write(buffer, 0, count);
                    }
                    out.flush();
                    return null;

                } catch (IOException e) {
                    errorString = new String("Could not send file: " +
                            e.getMessage());
                    logger.error(errorString);
                }
            }
        }

        // We only end up here in case of an error so return a suitable message
        if (errorString == null) {
            if (dirPathStr == null) {
                errorString = new String("Invalid input job file path specified!");
                logger.error(errorString);
            } else if (fileName == null) {
                errorString = new String("No filename provided!");
                logger.error(errorString);
            } else {
                // should never get here
                errorString = new String("Something went wrong.");
                logger.error(errorString);
            }
        }
        return new ModelAndView("jsonView", "error", errorString);
    }
    
    /**
     * Processes a file upload request returning a JSON object which indicates
     * whether the upload was successful and contains the filename and file
     * size.
     *
     * @param request The servlet request
     * @param response The servlet response containing the JSON data
     *
     * @return null
     */
    @RequestMapping("/uploadFile.do")    
    public ModelAndView uploadFile(HttpServletRequest request,
                                   HttpServletResponse response) {
    	logger.debug("Entering upload.do ");
        String jobInputDir = (String) request.getSession()
            .getAttribute("localJobInputDir");
        logger.debug("jobInputDir: + " + jobInputDir);
        
        MultipartHttpServletRequest mfReq =
            (MultipartHttpServletRequest) request; 
        String subJobId = (String) mfReq.getParameter("subJobId");
        
        boolean success = true;
        String error = null;
        FileInformation fileInfo = null;
        String destinationPath = null;

        MultipartFile f = mfReq.getFile("file");
        
        if (f != null) {        	
            
           	logger.debug("uploading file for single job ");
           	subJobId = GridSubmitController.FOR_ALL;
           	destinationPath = jobInputDir+GridSubmitController.TABLE_DIR+File.separator;
            
            if (jobInputDir != null && success) {

                    logger.info("Saving uploaded file "+f.getOriginalFilename());
                    //TO-DO allow to upload on tables directory as well. GUI functions to be added.
                    File destination = new File(destinationPath+f.getOriginalFilename());
                    if (destination.exists()) {
                        logger.debug("Will overwrite existing file.");
                    }
                    try {
                        f.transferTo(destination);
                    } catch (IOException e) {
                        logger.error("Could not move file: "+e.getMessage());
                        success = false;
                        error = new String("Could not process file.");
                    }
                    fileInfo = new FileInformation(
                            f.getOriginalFilename(), f.getSize());

            } else {
                logger.error("Input directory not found or couldn't be created in current session!");
                success = false;
                error = new String("Internal error. Please reload the page.");
            }        	
        }else{
            logger.error("No file parameter provided.");
            success = false;
            error = new String("Invalid request.");
        }        


        // We cannot use jsonView here since this is a file upload request and
        // ExtJS uses a hidden iframe which receives the response.
        response.setContentType("text/html");
        response.setStatus(HttpServletResponse.SC_OK);
        try {
            PrintWriter pw = response.getWriter();
            pw.print("{success:'"+success+"'");
            if (error != null) {
                pw.print(",error:'"+error+"'");
            }
            if (fileInfo != null) {
                pw.print(",name:'"+fileInfo.getName()+"',size:"+fileInfo.getSize()+",parentPath:'"+destinationPath+"',subJob:'"+subJobId+"'");
            }
            pw.print("}");
            pw.flush();
        } catch (IOException e) {
            logger.error(e.getMessage());
        }
        return null;
    }

    /**
     * Deletes one or more uploaded files of the current job.
     *
     * @param request The servlet request
     * @param response The servlet response
     *
     * @return A JSON object with a success attribute that indicates whether
     *         the files were successfully deleted.
     */
    @RequestMapping("/deleteFiles.do")    
    public ModelAndView deleteFiles(HttpServletRequest request,
                                    HttpServletResponse response) {

        String jobInputDir = (String) request.getSession()
            .getAttribute("localJobInputDir");
        ModelAndView mav = new ModelAndView("jsonView");
        boolean success;
        
        if (jobInputDir != null) {
            success = true;
            String filesPrm = request.getParameter("files");
            String subJobPrm = (String) request.getParameter("subJobId");
            
            logger.debug("Request to delete "+filesPrm);
            String[] files = (String[]) JSONArray.toArray(
                    JSONArray.fromObject(filesPrm), String.class);
            String[] subJobId = (String[]) JSONArray.toArray(
                    JSONArray.fromObject(subJobPrm), String.class);
            int i =0;
            for (String filename: files) {
            	String fullFilename = null;
            	
            	if(subJobId[i] == null || subJobId[i].equals(""))
            		subJobId[i] = GridSubmitController.FOR_ALL;
            	
            	if(subJobId[i].equals(GridSubmitController.FOR_ALL)){
            		logger.debug("Deleting "+filename+" for subJob"+subJobId[i]);
               		fullFilename = jobInputDir+GridSubmitController.TABLE_DIR
                		                          +File.separator+filename;
            	}else{
            		logger.debug("Deleting "+filename+" for subJob"+subJobId[i]);
                	fullFilename = jobInputDir+subJobId[i]+File.separator
                		               +GridSubmitController.TABLE_DIR+File.separator+filename;
            	}

                File f = new File(fullFilename);
                if (f.exists() && f.isFile()) {
                    logger.debug("Deleting "+f.getPath());
                    boolean lsuccess = f.delete();
                    if (!lsuccess) {
                        logger.warn("Unable to delete "+f.getPath());
                        success = false;
                    }
                } else {
                    logger.warn(f.getPath()+" does not exist or is not a file!");
                }
                i++;
            }
        } else {
            success = false;
        }

        mav.addObject("success", success);
        return mav;
    }
    
    /**
     * Get status of the current job submission.
     *
     * @param request The servlet request
     * @param response The servlet response
     *
     * @return A JSON object with a success attribute that indicates the status.
     *         
     */
    @RequestMapping("/getJobStatus.do")  
    public ModelAndView getJobStatus(HttpServletRequest request,
                                    HttpServletResponse response) {

        ModelAndView mav = new ModelAndView("jsonView");
        GridTransferStatus jobStatus = (GridTransferStatus)request.getSession().getAttribute("gridStatus");
        
        if (jobStatus != null) {
        	mav.addObject("data", jobStatus.currentStatusMsg);
        	mav.addObject("jobStatus", jobStatus.jobSubmissionStatus);
        } else {
        	mav.addObject("data", "Cloud File Transfer failed.");
        	mav.addObject("jobStatus", JobSubmissionStatus.Failed);
        }

        mav.addObject("success", true);
        return mav;
    }
    
    /**
     * Cancels the current job submission. Called to clean up temporary files.
     *
     * @param request The servlet request
     * @param response The servlet response
     *
     * @return null
     */
    @RequestMapping("/cancelSubmission.do")    
    public ModelAndView cancelSubmission(HttpServletRequest request,
                                         HttpServletResponse response) {

        String jobInputDir = (String) request.getSession()
            .getAttribute("localJobInputDir");

        if (jobInputDir != null) {
            logger.debug("Deleting temporary job files.");
            File jobDir = new File(jobInputDir);
            FileUtil.deleteFilesRecursive(jobDir);
            request.getSession().removeAttribute("localJobInputDir");
        }

        return null;
    }

    /**
     * Given a credential, this function generates a directory name based on the distinguished name of the credential
     * @param credential
     * @return
     */
    public static String generateCertDNDirectory(Object credential) throws GSSException {
    	GSSCredential cred = (GSSCredential)credential;
        return cred.getName().toString().replaceAll("=", "_").replaceAll("/", "_").replaceAll(" ", "_").substring(1);//certDN.replaceAll("=", "_").replaceAll(" ", "_").replaceAll(",", "_");
    }

    /**
     * Processes a job submission request.
     *
     * @param request The servlet request
     * @param response The servlet response
     *
     * @return A JSON object with a success attribute that indicates whether
     *         the job was successfully submitted.
     */
    @RequestMapping("/submitJob.do")    
    public ModelAndView submitJob(HttpServletRequest request,
                                  HttpServletResponse response,
                                  VEGLJob job) {

    	boolean success = true;
    	VEGLSeries series = null;
    	final String user = (String)request.getSession().getAttribute("openID-Email");//request.getRemoteUser();
    	String newSeriesName = request.getParameter("seriesName");
    	String seriesIdStr = request.getParameter("seriesId");
    	ModelAndView mav = new ModelAndView("jsonView");
    	
    	//Used to store Job Submission status, because there will be another request checking this.
		GridTransferStatus gridStatus = new GridTransferStatus();
		gridStatus.jobSubmissionStatus = JobSubmissionStatus.Pending;
		request.getSession().setAttribute("gridStatus", gridStatus);
    	
    	// if seriesName parameter was provided then we create a new series
        // otherwise seriesId contains the id of the series to use.
        if (newSeriesName != null && newSeriesName != "") {
            String newSeriesDesc = request.getParameter("seriesDesc");

            logger.debug("Creating new series '"+newSeriesName+"'.");
            series = new VEGLSeries();
            series.setUser(user);
            series.setName(newSeriesName);
            if (newSeriesDesc != null) {
                series.setDescription(newSeriesDesc);
            }
            jobManager.saveSeries(series);
            // Note that we can now access the series' new ID

        } else if (seriesIdStr != null && seriesIdStr != "") {
            try {
                int seriesId = Integer.parseInt(seriesIdStr);
                series = jobManager.getSeriesById(seriesId);
            } catch (NumberFormatException e) {
                logger.error("Error parsing series ID!");
            }
        }
        
        if (job.getS3OutputAccessKey() == null || job.getS3OutputAccessKey().isEmpty() ||
        	job.getS3OutputSecretKey() == null || job.getS3OutputSecretKey().isEmpty() ||
        	job.getS3OutputBucket() == null || job.getS3OutputBucket().isEmpty()) {
        	success = false;
        	final String msg = "No output S3 credentials found. NOT submitting job!";
        	logger.error(msg);
            gridStatus.currentStatusMsg = msg;
            gridStatus.jobSubmissionStatus = JobSubmissionStatus.Failed;
        } else if (series == null) {
            success = false;
            final String msg = "No valid series found. NOT submitting job!";
            logger.error(msg);
            gridStatus.currentStatusMsg = msg;
            gridStatus.jobSubmissionStatus = JobSubmissionStatus.Failed;
        } else {
        	
        	job.setSeriesId(series.getId());
            job.setEmailAddress(user);
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss");
            String dateFmt = sdf.format(new Date());
            
            logger.info("Submitting job " + job);
            AWSCredentials credentials = (AWSCredentials)request.getSession().getAttribute("AWSCred");
            ProviderCredentials outputS3StorageCreds = new org.jets3t.service.security.AWSCredentials(job.getS3OutputAccessKey(), job.getS3OutputSecretKey());
            
            // create the base S3 object storage key path. The final key will be this with
			// the filename appended.
			String jobKeyPath = String.format("VEGL-%1$s-%2$s", user, dateFmt);
			
			
            // copy files to S3 storage for processing 
	        try {
	        	
				// get job files from local directory
				String localJobInputDir = (String) request.getSession().getAttribute("localJobInputDir");
				logger.info("uploading files from " + localJobInputDir + GridSubmitController.TABLE_DIR);
				File dir = new File(localJobInputDir + GridSubmitController.TABLE_DIR); 
				File[] files = dir.listFiles(); 
				
				// check if the vegl script and erddap request exist for the job. If not it can't be submitted
				if (files.length == 0)
				{
					mav.addObject("msg", "Job must have a vegl_script and subset_request script file in order to submit");
					return mav;
				}
				
				// set the output directory for results to be transferred to
				job.setS3OutputBaseKey(jobKeyPath + "/output");
				
				// copy job files to S3 storage service. 
				S3Bucket bucket = new S3Bucket(job.getS3OutputBucket());
				RestS3Service s3Service = new RestS3Service(outputS3StorageCreds);
				
				for (File file : files) {
					String fileKeyPath =String.format("%1$s/%2$s", jobKeyPath, file.getName());
					logger.info("Uploading " + fileKeyPath);
					S3Object obj = new S3Object(bucket, file);
					obj.setKey(fileKeyPath);
					s3Service.putObject(bucket, obj);
					logger.info(fileKeyPath + " uploaded to " + bucket.getName() + " S3 bucket");
				}
				
				gridStatus.currentStatusMsg = GridSubmitController.TRANSFER_COMPLETE;
				
			} catch (AmazonClientException amazonClientException) {
	        	logger.error(GridSubmitController.S3_FILE_COPY_ERROR);
	        	gridStatus.currentStatusMsg = GridSubmitController.S3_FILE_COPY_ERROR;
	            gridStatus.jobSubmissionStatus = JobSubmissionStatus.Failed;
	        	amazonClientException.printStackTrace();
	        	success = false;
	        } catch (Exception e) {
				// TODO Auto-generated catch block
				logger.error("Job submission failed.");
				e.printStackTrace();
				success = false;
			}
	        
			// launch the ec2 instance
			AmazonEC2 ec2 = new AmazonEC2Client(credentials);
			ec2.setEndpoint(hostConfigurer.resolvePlaceholder("ec2.endpoint"));
        	String imageId = hostConfigurer.resolvePlaceholder("ami.id");
			RunInstancesRequest instanceRequest = new RunInstancesRequest(imageId, 1, 1);
			
			// user data is passed to the instance on launch. This will be the path to the S3 directory 
			// where the input files are stored. The instance will download the input files and attempt
			// to run the vegl_script.sh that was built in the Script Builder.
			JSONObject encodedUserData = new JSONObject();
			encodedUserData.put("s3OutputBucket", job.getS3OutputBucket());
			encodedUserData.put("s3OutputBaseKeyPath", jobKeyPath.replace("//", "/"));
			encodedUserData.put("s3OutputAccessKey", job.getS3OutputAccessKey());
			encodedUserData.put("s3OutputSecretKey", job.getS3OutputSecretKey());
			
			String base64EncodedUserData = new String(Base64.encodeBase64(encodedUserData.toString().getBytes()));
			instanceRequest.setUserData(base64EncodedUserData);
			instanceRequest.setInstanceType("m1.large");
			instanceRequest.setKeyName("terry-key"); //TODO - bacon - DELETE THIS CODE - it's for testing
			RunInstancesResult result = ec2.runInstances(instanceRequest);
			List<Instance> instances = result.getReservation().getInstances();
			
			if (instances.size() > 0)
			{
				Instance instance = instances.get(0);
				String instanceId = instance.getInstanceId();
   				logger.info("Launched instance: " + instanceId);
   				success = true;
   				
   				// set reference as instanceId for use when killing a job 
   				job.setEc2InstanceId(instanceId);
			}
			else
			{
				logger.error("Failed to launch instance to run job " + job.getId());
				success = false;
			}
			
   			if (success) {
                job.setSubmitDate(dateFmt);
                job.setStatus("Active");
                jobManager.saveJob(job);
                gridStatus.jobSubmissionStatus = JobSubmissionStatus.Running;
	        } else {
	        	gridStatus.jobSubmissionStatus = JobSubmissionStatus.Failed;
   				gridStatus.currentStatusMsg = GridSubmitController.INTERNAL_ERROR;
	        }
	        
	        request.getSession().removeAttribute("jobInputDir");
            request.getSession().removeAttribute("localJobInputDir");
        }
        
        // Save in session for status update request for this job.
        request.getSession().setAttribute("gridStatus", gridStatus);
        
        mav.addObject("success", success);
        
        return mav;
    }
    
    /**
     * Creates a new VEGL job initialised with the default configuration values
     * @param email
     * @return
     */
    private VEGLJob createDefaultVEGLJob(String email) {
    	VEGLJob job = new VEGLJob(); 
    	
    	job.setUser(email);
    	job.setEmailAddress(email);
    	job.setEc2AMI(hostConfigurer.resolvePlaceholder("ami.id"));
    	job.setEc2Endpoint(hostConfigurer.resolvePlaceholder("ec2.endpoint"));
    	job.setS3OutputBucket("vegl-portal");
    	job.setName("VEGL-Job");
    	job.setDescription("");
    	
    	return job;
    }
    
    /**
     * Creates a new Job object with predefined values for some fields.
     *
     * @param request The servlet request containing a session object
     *
     * @return The new job object.
     */
    private VEGLJob prepareModel(HttpServletRequest request) {
        final String email = (String)request.getSession().getAttribute("openID-Email");//request.getRemoteUser();
        String description = "";
      
        //Create local stageIn directory.
        boolean success = createLocalDir(request);
        if(!success){
        	logger.error("Setting up local StageIn directory failed.");
        	return null;
        }        

        logger.debug("Creating new VEGLJob instance");
        VEGLJob job = createDefaultVEGLJob(email); 
		
        
        // create subset request script file
        success = createSubsetScriptFile(request);
        
        if (!success){
        	logger.error("No subset area has been selected.");
        	return null;
        }
        
        // Check if the ScriptBuilder was used. If so, there is a file in the
        // system temp directory which needs to be staged in. 
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss");
        String dateFmt = sdf.format(new Date());
        String jobID = email + "-" + dateFmt + File.separator;
        String jobInputDir = stagingInformation.getStageInDirectory() + jobID;
        String newScript = (String) request.getSession().getAttribute("scriptFile");
	    
        if (newScript != null) {
	        logger.debug("Adding "+newScript+" to stage-in directory");
	        File tmpScriptFile = new File(System.getProperty("java.io.tmpdir") + File.separator+newScript+".sh");
	        File newScriptFile = new File(jobInputDir+GridSubmitController.TABLE_DIR, tmpScriptFile.getName());
	        success = FileUtil.moveFile(tmpScriptFile, newScriptFile);
	        
	        if (!success){
	            logger.error("Could not move "+newScript+" to stage-in!");
	        }
	    }

        job.setDescription(description);

        return job;
    }
    
    /**
     * Creates a new subset_request.sh script file that will get the subset files for the area selected
     * on the map and save them to the input directory on the Eucalyptus instance. This script will 
     * be executed on launch of the instance prior to the vegl processing script.
     * 
     * @param request The HTTPServlet request
     */
    private boolean createSubsetScriptFile(HttpServletRequest request) {
    	
    	// check if subset areas have been selected
    	HashMap<String,String> erddapUrlMap = (HashMap)request.getSession().getAttribute("erddapUrlMap");
    	
    	if (erddapUrlMap != null) {
    		// create new subset request script file
        	String localJobInputDir = (String) request.getSession().getAttribute("localJobInputDir");
    		File subsetRequestScript = new File(localJobInputDir+GridSubmitController.TABLE_DIR+File.separator+"subset_request.sh");
    		
    		// iterate through the map of subset request URL's
    		Set<String> keys = erddapUrlMap.keySet();
    		Iterator<String> i = keys.iterator();
    		
    		try {
    			FileWriter out = new FileWriter(subsetRequestScript);
    			out.write("cd /tmp/input\n");
    			
    			while (i.hasNext()) {
    				
    				// get the ERDDAP subset request url and layer name
    				String fileName = (String)i.next();
    				String url = (String)erddapUrlMap.get(fileName);
    				
    				// add the command for making the subset request
    				out.write("wget '" + url +"'\n");
    			}
    			
    			out.close();
    			
    		} catch (IOException e) {
    			// TODO Auto-generated catch block
    			logger.error("Error creating subset request script");
    			e.printStackTrace();
    			return false;
    		} 
    		
    		// clear the subset URL's from the session so they aren't created again if the 
            // user submits another job
            request.getSession().setAttribute("erddapUrlMap", new HashMap<String,String>());

    	} else {
    		logger.warn("No subset area selected");
    	}
    	
		return true;
    }
    
	/** 
     * Create stageIn directories on portal host, so user can upload files easy.
     *
     */
	private boolean createLocalDir(HttpServletRequest request) {
		
		GridTransferStatus status = new GridTransferStatus();
		final String user = (String)request.getSession().getAttribute("openID-Email");//request.getRemoteUser();
		
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss");
        String dateFmt = sdf.format(new Date());
        String jobID = user + "-" + dateFmt + File.separator;
        String jobInputDir = stagingInformation.getStageInDirectory() + jobID;
        
        boolean success = (new File(jobInputDir)).mkdir();
        
        // create stageIn directory
        success = (new File(jobInputDir+GridSubmitController.TABLE_DIR+File.separator)).mkdir();
        
        if (!success) {
            logger.error("Could not create local stageIn directories ");
        }
        // Save in session to use it when submitting job
        request.getSession().setAttribute("localJobInputDir", jobInputDir);
        // Save in session for status update request for this job.
        request.getSession().setAttribute("gridStatus", status);
        return success;
	}

	/**
	 * Funtion th
	 * @param files
	 * @param dir
	 * @param subJob
	 */
	private void addFileNamesOfDirectory(List files, File dir, String filePath){
        String fileNames[] = dir.list();
        
        for (int i=0; i<fileNames.length; i++) {
            File f = new File(dir, fileNames[i]);
            FileInformation fileInfo = new FileInformation(fileNames[i], f.length());
            fileInfo.setParentPath(filePath);
            logger.debug("File path is:"+filePath);
            files.add(fileInfo);     
        }
	}

	/**
	 * Simple object to hold Grid file transfer status.
	 * @author jam19d
	 *
	 */
	class GridTransferStatus {
		
		public int numFileCopied = 0;
		public String file = "";
		public String gridFullURL = "";
		public String gridServer = "";
		public String currentStatusMsg = "";
		public JobSubmissionStatus jobSubmissionStatus = JobSubmissionStatus.Pending;				
	}
	

	/**
	 * Enum to indicate over all job submission status.
	 */
	public enum JobSubmissionStatus{Pending,Running,Done,Failed }
}