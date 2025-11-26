"""
Setup script for OpenLP Sync Plugin
"""

from setuptools import setup, find_packages

setup(
    name='openlp-sync-plugin',
    version='1.0.0',
    description='OpenLP plugin to sync songs from backend API',
    author='OpenLP Database Sync Project',
    author_email='',
    packages=find_packages(),
    install_requires=[
        'requests>=2.31.0',
    ],
    python_requires='>=3.6',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: End Users/Desktop',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
    ],
)


