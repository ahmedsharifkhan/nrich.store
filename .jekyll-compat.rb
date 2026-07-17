jekyll_root = Gem::Specification.find_by_name("jekyll").full_gem_path
jekyll_lib = File.join(jekyll_root, "lib")
jekyll_entry = File.join(jekyll_lib, "jekyll.rb")

source = File.read(jekyll_entry).sub(
  'Dir[glob].sort.each do |f|',
  '(Dir.exist?(File.dirname(glob)) ? Dir.children(File.dirname(glob)).select { |name| name.end_with?(".rb") }.sort.map { |name| File.join(File.dirname(glob), name) } : []).each do |f|'
)
source = source.sub(
  'require "jekyll/filters"',
  "Dir.children(File.join(#{jekyll_lib.inspect}, \"jekyll/filters\")).select { |name| name.end_with?(\".rb\") }.sort.each { |name| require File.join(#{jekyll_lib.inspect}, \"jekyll/filters\", name) }; require \"jekyll/filters\""
)
liquid_tags = File.join(Gem::Specification.find_by_name("liquid").full_gem_path, "lib", "liquid", "tags")
source = source.sub(
  'require "liquid"',
  "require \"liquid\"; Dir.children(#{liquid_tags.inspect}).select { |name| name.end_with?(\".rb\") }.sort.each { |name| require File.join(#{liquid_tags.inspect}, name) }"
)

eval(source, TOPLEVEL_BINDING, jekyll_entry)
$LOADED_FEATURES << jekyll_entry
load File.join(jekyll_root, "exe", "jekyll")
