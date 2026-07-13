import pyodbc
c=pyodbc.connect('DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=..\\TEW9Save.mdb;PWD=20YearsOfTEW').cursor()
c.execute('SELECT Attribute FROM tblAttribute WHERE WorkerUID = 380 AND Hidden = 0')
print('Worker 380 visible attributes:', [r[0] for r in c.fetchall()])
