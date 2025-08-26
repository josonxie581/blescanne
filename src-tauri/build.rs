use std::{env, path::PathBuf};

fn main() {
    // Keep Tauri codegen
    tauri_build::build();

    // Link against SimpleBLE if available via env variables
    // SIMPLEBLE_LIB_DIR: folder containing SimpleBLE.lib/simpleble.lib
    // SIMPLEBLE_LINK_STATIC: set to "1" to prefer static linking
    println!("cargo:rerun-if-env-changed=SIMPLEBLE_LIB_DIR");
    println!("cargo:rerun-if-env-changed=SIMPLEBLE_LINK_STATIC");

    let lib_dir = match env::var("SIMPLEBLE_LIB_DIR") {
        Ok(v) if !v.trim().is_empty() => Some(PathBuf::from(v)),
        _ => None,
    };

    if let Some(dir) = lib_dir {
        println!("cargo:rustc-link-search=native={}", dir.display());

        let static_link = matches!(env::var("SIMPLEBLE_LINK_STATIC"), Ok(s) if s == "1" || s.eq_ignore_ascii_case("true"));
        let kind = if static_link { "static" } else { "dylib" };

        // Try common library base names on Windows
        for base in ["SimpleBLE", "simpleble"] {
            let lib_candidate = dir.join(format!("{base}.lib"));
            if lib_candidate.exists() {
                println!("cargo:rustc-link-lib={}={}", kind, base);
                // No need to try further once found
                return;
            }
        }

        // Fallback: still emit link-lib to help MSVC find import lib via LIB path
        println!("cargo:rustc-link-lib={}={}", kind, "SimpleBLE");
    }
}