from setuptools import setup, find_packages

setup(
    name='cv_parser',
    version='0.0.1',
    description='CV Parser for HR Job Applicants',
    author='vivchand',
    author_email='vivyn.crs@gmail.com',
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=['pdfminer.six'],
)
