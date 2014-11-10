Ext.ns('ScriptBuilder.Components');

/**
 * The raw configuration for building the scriptbuilder tree
 *
 * Retrieve available templates from the marketplace then populate the
 * panel with the resulting tree.
 */
ScriptBuilder.Components.getComponents = function(tree) {
    // http://jupiter-bt.nexus.csiro.au:5000/templates
    // http://localhost:8000/templates
    Ext.Ajax.request({
        url : 'http://vhirl-dev.csiro.au/scm/solutions',
        scope : this,
        headers: {
            Accept: 'application/json'
        },
        callback : function(options, success, response) {
            var errorMsg, errorInfo;

            if (success) {
                var responseObj = Ext.JSON.decode(response.responseText);
                if (responseObj) {
                    var problems = {};
                    var solution, problem, data, prob_id;

                    for (var idx in responseObj.solutions) {
                        data = responseObj.solutions[idx];
                        solution = {
                            id: data['@id'],
                            type: "s",
                            text: data.name,
                            qtip: data.description,
                            leaf: true
                        };
                        prob_id = data.problem['@id'];
                        problem = problems[prob_id];
                        if (!problem) {
                            problem = {
                                text: data.problem.name,
                                type: "category",
                                qtip: data.problem.description,
                                expanded: true,
                                children: []
                            };

                            problems[prob_id] = problem;
                        }
                        problem.children.push(solution);
                    }

                    // Populate the tree in panel
                    for (var t in problems) {
                        tree.getRootNode().appendChild(problems[t]);
                    }
                } else {
                    console.log("No response");

                    errorMsg = responseObj.msg;
                    errorInfo = responseObj.debugInfo;
                }
            } else {
                console.log("no success");

                errorMsg = "There was an error loading your script.";
                errorInfo = "Please try again in a few minutes or report this error to cg_admin@csiro.au.";
            }

            if (errorMsg) {
                //Create an error object and pass it to custom error window
                var errorObj = {
                    title : 'Script Loading Error',
                    message : errorMsg,
                    info : errorInfo
                };

                var errorWin = Ext.create('portal.widgets.window.ErrorWindow', {
                    errorObj : errorObj
                });
                errorWin.show();
            }
        }
    });
};
