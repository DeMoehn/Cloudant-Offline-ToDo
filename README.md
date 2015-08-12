Cloudant Offline ToDo List
=================

##Live action?
- Demo available via: http://cloudant-offline-todo.mybluemix.net

##Changes
- Added PouchDB 4.0 & jQuery 2.1.4

##How to run

* Clone the repository and change to the "app" directory
```
      $ cd /Cloudant-Offline-ToDo/app/...
```
* Change the name from config-example to config
```
      $ mv config-example config
```
* Edit the config-example with your credentials (Press `Ctrl+X` to finish, Accept with `Y` and `Enter`)
```
      $ sudo nano config
```
* Edit your local hosts file to point `local.dev` at `localhost`:
```
      $ sudo nano /etc/hosts
```
* Add `127.0.0.1 local.dev` to the end of the file. (Press `Ctrl+X` to finish, Accept with `Y` and `Enter`)

* Configure CORS support on Cloudant.  Change `USERNAME` to your account name:
```
      $ curl -i -u USERNAME -X PUT https://USERNAME.cloudant.com/_api/v2/user/config/cors -H "Content-Type: application/json" -d '{"enable_cors":true,"allow_credentials":true,"allow_methods":["GET","PUT","POST","DELETE","OPTIONS"],"origins":["http://local.dev:8000"]}'
```
* Use the `server.py` script to run a simple python server on your localhost to test the application locally
```
      $ python server.py
```
* Run the deployment Script to create views and sample data in your Cloudant Account (NOT needed right now, as we currenty don't use design documents (views))
```
      $ ./deploy
```
* Visit http://local.dev:8000

##Deploy on IBM Bluemix
* Login to IBM Bluemix via the CF Command Line Tool
```
      $ cf login
```

* Change to the app directory and push the inital application via (Change APPN-AME!):
```
      $ cf push APP-NAME -m 64M -b https://github.com/cloudfoundry/staticfile-buildpack.git -s cflinuxfs2
```

* To add Git-Integration go to: https://hub.jazz.net/ and either login or create an account

* Create a new Project and choose "From an existing Git Project" and choose your Git Project

* Use the "Build&Deploy" Button (upper right)

* Create a new Phase, make sure the GIT URL is correct, and tick the box "Run job, when GIT Repo changes"

* Choose "Jobs" add a new "Deploy" Job and make sure to change the script to only include the app/ directory (otherwise Jazzhub pushes the whole repo!)
```
#!/bin/bash
cf push "${CF_APP}" -p app/
```
