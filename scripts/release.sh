#!/bin/bash

# Script to create a new release: bump version, build, commit, tag, and push to both repos

set -e  # Exit on error

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Split version into parts
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Increment minor version and reset patch to 0
NEW_MINOR=$((MINOR + 1))
NEW_VERSION="${MAJOR}.${NEW_MINOR}.0"

echo "🚀 Creating new release"
echo "Current version: v$CURRENT_VERSION"
echo "New version: v$NEW_VERSION"
echo ""

# Update package.json
echo "📝 Updating package.json..."
npm version $NEW_VERSION --no-git-tag-version

# Extract major version for metadata.json (metadata uses single number)
METADATA_VERSION="${MAJOR}"
if [ "$NEW_MINOR" -gt 0 ]; then
    METADATA_VERSION="${MAJOR}${NEW_MINOR}"
fi

# Update metadata.json
echo "📝 Updating metadata.json..."
jq --arg version "$METADATA_VERSION" '.version = ($version | tonumber)' metadata.json > metadata.json.tmp
mv metadata.json.tmp metadata.json

# Update debian/changelog
echo "📝 Updating debian/changelog..."
CURRENT_DATE=$(date -R)
AUTHOR_NAME="Jose Francisco Gonzalez"
AUTHOR_EMAIL="jfgs1609@gmail.com"

cat > debian/changelog.tmp << EOF
obision-ext-dash ($NEW_VERSION-1) unstable; urgency=medium

  * Release version $NEW_VERSION

 -- $AUTHOR_NAME <$AUTHOR_EMAIL>  $CURRENT_DATE

EOF

cat debian/changelog >> debian/changelog.tmp
mv debian/changelog.tmp debian/changelog

# Commit changes
echo "💾 Committing changes..."
git add metadata.json package.json debian/changelog package-lock.json
git commit -m "Release version $NEW_VERSION"

# Create tag
echo "🏷️  Creating tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

# Push to repository
echo "⬆️  Pushing to repository..."
git push origin master
git push origin "v$NEW_VERSION"

echo ""
echo "📦 Building .deb package..."
npm run deb-build

# Find the generated DEB file
DEB_FILE=$(ls -t ../obision-ext-dash_*.deb 2>/dev/null | head -1)

# Verify DEB exists
if [ -z "$DEB_FILE" ] || [ ! -f "$DEB_FILE" ]; then
    echo "❌ ERROR: DEB file not found!"
    echo "Expected: ../obision-ext-dash_*.deb"
    exit 1
fi

echo "✅ DEB package built successfully: $(basename $DEB_FILE)"

# Upload to obision-packages
echo ""
echo "📤 Uploading to obision-packages repository..."

# Check if obision-packages exists
if [ ! -d "../obision-packages" ]; then
    echo "❌ ERROR: ../obision-packages directory not found"
    echo "Clone it first: cd .. && git clone git@github.com:nirlob/obision-packages.git"
    exit 1
fi

cd ../obision-packages

# Pull latest changes
git pull origin master

# Create debs directory if it doesn't exist
mkdir -p debs

# Remove old versions of the package
rm -f debs/obision-ext-dash_*.deb

# Copy the .deb file with versioned name
cp "$DEB_FILE" debs/obision-ext-dash_${NEW_VERSION}_all.deb

echo "✅ Copied DEB file to obision-packages/debs"

# Regenerate Packages file
dpkg-scanpackages --multiversion debs > Packages
gzip -k -f Packages

echo "✅ Updated Packages file"

# Generate Release file
cat > Release << EOF
Origin: Obision
Label: Obision Packages
Suite: stable
Codename: stable
Architectures: all amd64 arm64
Components: main
Description: Obision APT Repository
Date: $(date -Ru)
EOF

# Add checksums to Release file
echo "MD5Sum:" >> Release
for file in Packages Packages.gz; do
  echo " $(md5sum $file | cut -d' ' -f1) $(wc -c < $file) $file" >> Release
done

echo "SHA1:" >> Release
for file in Packages Packages.gz; do
  echo " $(sha1sum $file | cut -d' ' -f1) $(wc -c < $file) $file" >> Release
done

echo "SHA256:" >> Release
for file in Packages Packages.gz; do
  echo " $(sha256sum $file | cut -d' ' -f1) $(wc -c < $file) $file" >> Release
done

echo "✅ Updated Release file"

# Commit and push
git add -A debs/
git add Packages Packages.gz Release
git commit -m "Add obision-ext-dash ${NEW_VERSION}"
git push origin master

echo "✅ Pushed changes to obision-packages"

cd ../obision-ext-dash

echo ""
echo "✅ Release $NEW_VERSION completed successfully!"
echo ""
echo "Actions completed:"
echo "  ✅ Version bumped and committed"
echo "  ✅ Tag v$NEW_VERSION created and pushed"
echo "  ✅ .deb package built"
echo "  ✅ Package uploaded to obision-packages"
echo "  ✅ Packages and Release files updated"
echo ""
