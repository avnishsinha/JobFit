# Privacy Notes

Resume text and extracted PDF contents are sensitive personal information.
JobFit stores extracted resume text and job descriptions only to provide the
private workspace and saved analyses. The current implementation does not
store embeddings or uploaded PDF bytes.

Production operators must configure database access controls, encrypted
backups, retention/deletion procedures, and a user-facing privacy policy
before launch. Application logs must not contain resume text, passwords,
session cookies, payment details, or full job descriptions.
