#!/bin/bash

CONTENTS=( 
    "consumer.js"
    "core.js"
    "cron.js"
    "database.js"
    "gmail.js"
    "helpers.js"
    "jira.js"
    "run-once.js"
    "errors"
    "models"
    "credentials"
    "package.json"
    "README.md" )

zip -r deploy-bundle "${CONTENTS[@]}"