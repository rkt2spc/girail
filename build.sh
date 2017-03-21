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

rm -R "bin" 2> /dev/null
mkdir -p "bin"
cp -R "${CONTENTS[@]}" "bin"