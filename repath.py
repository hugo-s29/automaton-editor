import os

files = os.listdir('./dist/assets/')

for file in files:
    if file.endswith('.css'):
        with open('./dist/assets/' + file, 'rw') as f:
            content = f.read()

