-- Promote the existing beta grant so a person (not only info@) is SUPER_ADMIN.
UPDATE "PlatformAccessEmail"
SET "access" = 'SUPER_ADMIN'
WHERE lower("email") = 'afz.0228@gmail.com';

-- If that professional already exists, keep Professional.role in sync.
UPDATE "Professional"
SET "role" = 'SUPER_ADMIN'
WHERE lower("email") = 'afz.0228@gmail.com';
