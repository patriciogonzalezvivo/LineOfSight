import json
import os
import itertools

data = []
folder = './tle'
for filename in os.listdir(folder):
    type = os.path.splitext(filename)[0]
    f = open(os.path.join(folder, filename), 'r')
    for name,lte1,lte2 in itertools.izip_longest(*[f]*3):
        sat = {}
        sat['type'] = type
        sat['name'] = name.rstrip()
        sat['lte1'] = lte1.rstrip()
        sat['lte2'] = lte2.rstrip()
        data.append(sat)
    f.close()

with open("satellites.json", "w") as outfile:
    outfile.write(json.dumps({'orbits' : data, outfile, indent=4))
outfile.close()