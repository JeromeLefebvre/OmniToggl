(() => {
  // Main action
  const action = new PlugIn.Action(async function startTogglTimerAction(
    selection,
  ) {
    const {
      config: { TRACKING_TAG_NAME, TRACKING_NAME_PREFIX },
      startTogglTimer,
      createTogglProject,
      createTogglClient,
      getTogglData,
      resetTasks,
      log,
    } = this.common;

    const trackingTag = flattenedTags.find((t) => t.name === TRACKING_TAG_NAME);

    try {
      resetTasks();
      let togglProjects, clients, wid;

      try {
        const data = await getTogglData();
        togglProjects = data.projects
        togglClients = data.clients
        wid = data.workspaces[0].id
      } catch (e) {
        await log(
          'An error occurred getting projects',
          'See console for more info',
        );
        console.error(e);
      }

      const task = selection.tasks[0];
      
      // gets the toggle client detail from omnifocus project parent folder
      const folderName = task.containingProject?.parentFolder?.name
      const toggleClient = togglClients.find(
        (c) => c.name.trim().toLowerCase() === folderName.trim().toLowerCase(),
      );
      let cid;
      if (!folderName) {
        cid = null;
      } else if (!toggleClient) {
        console.log(`Client not found, creating new ${folderName} project`);
        try {
          const r = await createTogglClient(folderName, wid);
          console.log(`project created id: ${r.id}`);
          cid = r.id;
        } catch (e) {
          console.log(`Error creating client ${folderName}`);
          console.log(JSON.stringify(e, null, 2));
        }
      } else {
        cid = toggleClient.id;
      }
      console.info('cid is: ', cid);
      
      
      // gets the toggle project detail from omnifocus project
      const projectName = task.containingProject?.name;
      console.info(`[Toggl] The selected project name is: ${projectName}`)
      const toggleProject = togglProjects.find(
        (p) => (p.name.trim().toLowerCase() === projectName.trim().toLowerCase()) &&
        !p.server_deleted_at,
      );
      
      let pid // we can get the wid from the toggle project details
      if (!projectName) {
        pid = null;
      } else if (!toggleProject) {
        console.log(`Project not found, creating new ${projectName} project`);
        try {
          const r = await createTogglProject(projectName, cid);
          console.log(`project created id: ${r.id}`);
          pid = r.id;
        } catch (e) {
          console.log(`Error creating project ${projectName}`);
          console.log(JSON.stringify(e, null, 2));
        }
      } else {
        pid = toggleProject.id;
      }
      console.info(`[toggl]pid is: ${pid}`);
      console.info(`[toggl] wid is ${wid}`)

      const taskTags = task.tags.map(t => t.name);

      try {
        const r = await startTogglTimer({
          description: task.name,
          created_with: 'omnifocus',
          tags: taskTags,
          pid
        });
        task.name = TRACKING_NAME_PREFIX + task.name;
        task.addTag(trackingTag);
        console.log('Timer started successfully', JSON.stringify(r));
      } catch (e) {
        await log('An error occurred', 'See console for more info');
        console.log(JSON.stringify(e, null, 2));
      }
    } catch (e) {
      await log('An error occurred', 'See console for more info');
      console.log(e);
      console.log(JSON.stringify(e, null, 2));
    }
  });

  action.validate = function startTogglTimerValidate(selection) {
    // selection options: tasks, projects, folders, tags
    console.info("One task is selected")
    return selection.tasks?.length === 1;
  };

  return action;
})();