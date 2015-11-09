import json
import os
import itertools

data = {}
types = []
# folder = './all'
folder = './curated'
extraCounter = 0
for filename in os.listdir(folder):
    if filename == ".DS_Store": 
        continue

    type = os.path.splitext(filename)[0]

    typeObj = {}
    typeObj['visible'] = False
    typeObj['name'] = type
    typeObj['label'] = type
    types.append(typeObj)

    f = open(os.path.join(folder, filename), 'r')
    for name,lte1,lte2 in itertools.izip_longest(*[f]*3):
        sat = {}
        sat['type'] = type
        sat['name'] = name.rstrip()
        sat['tleLine1'] = lte1.rstrip()
        sat['tleLine2'] = lte2.rstrip()
        sat['state'] = "operational"

        if sat['name'].endswith(' [B]'):
            sat['state'] = "backup";
        elif sat['name'].endswith(' [S]'):
            sat['state'] = "spare";
        elif sat['name'].endswith(' [-]'):
            sat['state'] = "nonoperational";
        elif sat['name'].endswith(' [P]'):
            sat['state'] = "partially operational";
        elif sat['name'].endswith(' [X]'):
            sat['state'] = "extended mission";

        if "[-]" in sat['name']: continue
        if "[P]" in sat['name']: continue
        if "[S]" in sat['name']: continue
        if "[B]" in sat['name']: continue

        if sat['name'] == 'GEARRS-1':
            continue

        if sat['name'].endswith(' [+]') or sat['name'].endswith(' [-]') or sat['name'].endswith(' [P]') or sat['name'].endswith(' [B]') or sat['name'].endswith(' [S]') or sat['name'].endswith(' [X]'):
            sat['name'] = sat['name'][:-4]

        if sat['name'] == 'SL-8 R/B' or sat['name'] == 'SL-16 R/B' or sat['name'] == 'SL-3 R/B' or sat['name'] == 'ARIANE 40 R/B' or sat['name'] == 'DELTA 2 R/B(1)' or sat['name'] == 'SL-14 R/B':
            sat['name'] += " " + str(extraCounter)
            extraCounter += 1

        if sat['name'] in data:
            data[ sat['name'] ]['type'] = sat['type'] + ', ' + data[ sat['name'] ]['type']
        else: 
            data[ sat['name'] ] = sat
    f.close()

with open("types.json", "w") as outfile:
    outfile.write(json.dumps(types, outfile, indent=4))

print(str(len(data)) + " satellites");
final_data = []
for satellite in data:
    final_data.append( data[satellite] )
with open("satellites.json", "w") as outfile:
    outfile.write(json.dumps(final_data, outfile, indent=4))
outfile.close()