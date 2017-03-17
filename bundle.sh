#!/bin/bash

CONTENTS=( 
    "index.js"
    "database.js"
    "helpers.js"
    "models"
    "processors"    
    "credentials"
    "package.json" )

zip -r deploy-bundle "${CONTENTS[@]}"