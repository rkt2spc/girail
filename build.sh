#!/bin/bash

CONTENTS=( 
    "index.js"
    "database.js"
    "helpers.js"
    "models"
    "processors"    
    "credentials"
    "package.json" )

rm -R "bin" 2> /dev/null
mkdir -p "bin"
cp -R "${CONTENTS[@]}" "bin"