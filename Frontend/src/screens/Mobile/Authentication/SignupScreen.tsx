import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as DocumentPicker from "expo-document-picker";
import { Banner, Button, FormField, MinimalistCalendarIcon, RolePill, SectionTitle, StepBadge, authErrorMessage, athleteSignupSchema, coachSignupSchema, MAX_DOCUMENT_BYTES, requestJson, requestMultipart, type AthleteSignupValues, type AuthRole, type AuthStep, type CoachSignupValues, type StoredUpload } from "./authShared";

type SignupScreenProps = {
  onGoLogin: () => void;
};

type ChoiceGroupProps = {
  label: string;
  placeholder?: string;
  options: readonly string[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

const genderOptions = ["Male", "Female"] as const;
const sportOptions = ["Basketball", "Track and Field", "Swimming"] as const;

function ChoiceGroup({ label, placeholder = "Select an option", options, value, error, onChange }: ChoiceGroupProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <View style={styles.dropdownGroup}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          error ? styles.dropdownError : undefined,
          open ? styles.dropdownTriggerOpen : undefined,
          pressed && styles.dropdownTriggerPressed
        ]}
      >
        <Text style={[styles.dropdownValueText, !value && styles.dropdownPlaceholderText]}>
          {value || placeholder}
        </Text>
        <View style={[styles.chevronWrap, open && styles.chevronOpen]}>
          <Text style={styles.dropdownChevron}>▼</Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((option, index) => {
            const selected = option === value;
            const isLast = index === options.length - 1;

            return (
              <Pressable
                key={option}
                onPress={() => handleSelect(option)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  !isLast && styles.dropdownOptionBorder,
                  selected && styles.dropdownOptionSelected,
                  pressed && styles.dropdownOptionPressed
                ]}
              >
                <Text style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextSelected]}>
                  {option}
                </Text>
                {selected ? <Text style={styles.dropdownCheckmark}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function SignupScreen({ onGoLogin }: SignupScreenProps) {
  const [role, setRole] = useState<AuthRole>("athlete");
  const [step, setStep] = useState<AuthStep>(1);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState<StoredUpload | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  const athleteForm = useForm<AthleteSignupValues>({
    resolver: zodResolver(athleteSignupSchema),
    defaultValues: {
      role: "athlete",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      contact_number: "",
      birthdate: "",
      gender: "Male",
      province: "",
      sport_type: "Basketball"
    }
  });

  const coachForm = useForm<CoachSignupValues>({
    resolver: zodResolver(coachSignupSchema),
    defaultValues: {
      role: "coach",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      contact_number: "",
      certification_license_num: "",
      years_of_experience: 0,
      current_institution: "",
      eligible_documents: null
    }
  });

  const activeForm = role === "athlete" ? athleteForm : coachForm;
  const sharedErrors = activeForm.formState.errors as Partial<Record<string, { message?: string }>>;
  const athleteErrors = athleteForm.formState.errors as Partial<Record<string, { message?: string }>>;
  const coachErrors = coachForm.formState.errors as Partial<Record<string, { message?: string }>>;
  useEffect(() => {
    setFeedback(null);
    setStep(1);
    setDocumentFile(null);
    athleteForm.reset({
      role: "athlete",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      contact_number: "",
      birthdate: "",
      gender: "Male",
      province: "",
      sport_type: "Basketball"
    });
    coachForm.reset({
      role: "coach",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      contact_number: "",
      certification_license_num: "",
      years_of_experience: 0,
      current_institution: "",
      eligible_documents: null
    });
  }, [athleteForm, coachForm, role]);

  const goNext = async () => {
    const fields = ["first_name", "last_name", "email", "password", "contact_number"] as const;
    const valid = await activeForm.trigger(fields);
    if (valid) {
      setStep(3);
    } else {
      setFeedback({ tone: "error", message: "Please complete the account information before continuing." });
    }
  };

  const uploadDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (typeof asset.size === "number" && asset.size > MAX_DOCUMENT_BYTES) {
      setFeedback({ tone: "error", message: "Document must be smaller than 25MB." });
      return;
    }

    const nextDocument: StoredUpload = {
      name: asset.name ?? "eligible-document",
      uri: asset.uri,
      mimeType: asset.mimeType ?? "application/octet-stream",
      size: asset.size ?? undefined
    };

    setDocumentFile(nextDocument);
    coachForm.setValue("eligible_documents", nextDocument, { shouldValidate: true });
    setFeedback({ tone: "success", message: `${nextDocument.name} attached.` });
  };

  const submitAthlete = athleteForm.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      await requestJson("/api/auth/register", values);
      setAccountCreated(true);
      athleteForm.reset();
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
      const fallback = error instanceof Error ? error.message : "Unable to create the account right now.";
      setFeedback({ tone: "error", message: authErrorMessage(status, fallback) });
    } finally {
      setLoading(false);
    }
  });

  const submitCoach = coachForm.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      const body = new FormData();
      body.append("role", values.role);
      body.append("first_name", values.first_name);
      body.append("last_name", values.last_name);
      body.append("email", values.email);
      body.append("password", values.password);
      if (values.contact_number) body.append("contact_number", values.contact_number);
      if (values.certification_license_num) body.append("certification_license_num", values.certification_license_num);
      body.append("years_of_experience", String(values.years_of_experience));
      body.append("current_institution", values.current_institution);

      if (documentFile) {
        body.append("eligible_documents", {
          uri: documentFile.uri,
          name: documentFile.name,
          type: documentFile.mimeType
        } as never);
      }

      await requestMultipart("/api/auth/register", body);
      setAccountCreated(true);
      coachForm.reset();
      setDocumentFile(null);
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
      const fallback = error instanceof Error ? error.message : "Unable to create the account right now.";
      setFeedback({ tone: "error", message: authErrorMessage(status, fallback) });
    } finally {
      setLoading(false);
    }
  });

  const submit = role === "athlete" ? submitAthlete : submitCoach;
  const selectedGender = athleteForm.watch("gender");
  const selectedSport = athleteForm.watch("sport_type");

  if (accountCreated) {
    return (
      <View style={styles.createdScreen}>
        <View style={styles.createdPanel}>
          <Text style={styles.createdTitle}>Account Created</Text>
          <Text style={styles.createdMessage}>Your account has been created successfully. You can now log in with your account details.</Text>
          <Button label="Back to Login" onPress={onGoLogin} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <Text style={styles.brand}>ATLETA</Text>
        <View style={styles.rule} />

        <SectionTitle title="Create your account" subtitle="Pick your role, fill in your details, and continue with personalized access." />
        <Banner tone={feedback?.tone ?? "info"} message={feedback?.message ?? ""} />

        <View style={styles.stepRow}>
          <StepBadge step={1} label="Role" active={step === 1} />
          <StepBadge step={2} label="Account" active={step === 2} />
          <StepBadge step={3} label="Details" active={step === 3} />
        </View>

        {step === 1 ? (
          <View>
            <Text style={styles.sectionLabel}>Select your role</Text>
            <View style={styles.roleRow}>
              <RolePill label="Athlete" selected={role === "athlete"} onPress={() => setRole("athlete")} />
              <RolePill label="Coach" selected={role === "coach"} onPress={() => setRole("coach")} />
            </View>
            <Text style={styles.helper}>The fields below will update automatically for the role you choose.</Text>
            <Button label="Continue" onPress={() => setStep(2)} />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.or}>or</Text>
              <View style={styles.divider} />
            </View>

            <Button label="Sign Up with Google" variant="secondary" icon={require("../../../assets/google.png")} onPress={() => setFeedback({ tone: "info", message: "Google sign-up is ready for your backend or Firebase OAuth flow." })} />
            <View style={styles.spacer} />
            <Button label="Sign Up with Facebook" variant="secondary" icon={require("../../../assets/facebook.png")} onPress={() => setFeedback({ tone: "info", message: "Facebook sign-up can be connected to your auth provider later." })} />
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <FormField control={activeForm.control as never} name={"first_name" as never} label="First Name" placeholder="G. Francis" error={sharedErrors.first_name?.message} />
            <FormField control={activeForm.control as never} name={"last_name" as never} label="Last Name" placeholder="Pelonio" error={sharedErrors.last_name?.message} />
            <FormField control={activeForm.control as never} name={"email" as never} label="Email Address" placeholder="coach@gmail.com" autoCapitalize="none" keyboardType="email-address" error={sharedErrors.email?.message} />
            <FormField control={activeForm.control as never} name={"password" as never} label="Password" placeholder="At least 8 chars" secureTextEntry error={sharedErrors.password?.message} />
            <FormField control={activeForm.control as never} name={"contact_number" as never} label="Contact Number" placeholder="09XXXXXXXXX" keyboardType="phone-pad" error={sharedErrors.contact_number?.message} />

            <View style={styles.navRow}>
              <Button label="Back" variant="ghost" onPress={() => setStep(1)} />
              <View style={styles.navSpacer} />
              <Button label="Next" onPress={goNext} />
            </View>
          </View>
        ) : null}

        {step === 3 && role === "athlete" ? (
          <View>
            <FormField control={athleteForm.control} name="birthdate" label="Birthdate" placeholder="YYYY-MM-DD" rightAccessory={<MinimalistCalendarIcon />} error={athleteErrors.birthdate?.message} />
            <ChoiceGroup label="Gender" placeholder="Select Gender" options={genderOptions} value={selectedGender} error={athleteErrors.gender?.message} onChange={(value) => athleteForm.setValue("gender", value as AthleteSignupValues["gender"], { shouldDirty: true, shouldValidate: true })} />
            <FormField control={athleteForm.control} name="province" label="Province" placeholder="Camarines Sur" error={athleteErrors.province?.message} />
            <ChoiceGroup label="Sport Type" placeholder="Select Sport Type" options={sportOptions} value={selectedSport} error={athleteErrors.sport_type?.message} onChange={(value) => athleteForm.setValue("sport_type", value as AthleteSignupValues["sport_type"], { shouldDirty: true, shouldValidate: true })} />

            <View style={styles.navRow}>
              <Button label="Back" variant="ghost" onPress={() => setStep(2)} />
              <View style={styles.navSpacer} />
              <Button label="Sign Up" loading={loading} onPress={submit} />
            </View>
          </View>
        ) : null}

        {step === 3 && role === "coach" ? (
          <View>
            <FormField control={coachForm.control} name="certification_license_num" label="Certification License Number" placeholder="Optional" error={coachErrors.certification_license_num?.message} />
            <FormField control={coachForm.control} name="years_of_experience" label="Years of Experience" placeholder="0 - 60" keyboardType="numeric" error={coachErrors.years_of_experience?.message} />
            <FormField control={coachForm.control} name="current_institution" label="Current Institution" placeholder="School, club, or program" error={coachErrors.current_institution?.message} />

            <View style={styles.documentBox}>
              <Text style={styles.documentLabel}>Eligible Documents</Text>
              <Button label={documentFile ? "Replace File" : "Choose File"} variant="secondary" onPress={uploadDocument} />
              <Text style={styles.documentHint}>{documentFile ? documentFile.name : "Professional license, certification, image, or PDF. Max 25MB."}</Text>
              {coachErrors.eligible_documents?.message ? <Text style={styles.error}>{coachErrors.eligible_documents.message}</Text> : null}
            </View>

            <View style={styles.navRow}>
              <Button label="Back" variant="ghost" onPress={() => setStep(2)} />
              <View style={styles.navSpacer} />
              <Button label="Sign Up" loading={loading} onPress={submit} />
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Already have an account? <Text style={styles.footerLink} onPress={onGoLogin}>Log In</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    paddingBottom: 36
  },
  shell: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 72
  },
  brand: {
    color: "#141c3a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.3
  },
  rule: {
    backgroundColor: "#141c3a",
    height: 1,
    marginVertical: 28,
    opacity: 0.8
  },
  stepRow: {
    marginBottom: 12
  },
  sectionLabel: {
    color: "#141c3a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4
  },
  helper: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  navRow: {
    flexDirection: "row",
    marginTop: 8
  },
  navSpacer: {
    width: 12
  },
  documentBox: {
    marginBottom: 14
  },
  documentLabel: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6
  },
  documentHint: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 8
  },
  dropdownGroup: {
    marginBottom: 14
  },
  dropdownLabel: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6
  },
  dropdownTrigger: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#a3a3a3",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 16
  },
  dropdownTriggerOpen: {
    borderColor: "#141c3a"
  },
  dropdownTriggerPressed: {
    backgroundColor: "#f8fafc"
  },
  dropdownError: {
    borderColor: "#ef4444"
  },
  dropdownValueText: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "500"
  },
  dropdownPlaceholderText: {
    color: "#9aa2b8"
  },
  chevronWrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }]
  },
  dropdownChevron: {
    color: "#6b7280",
    fontSize: 12
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  dropdownOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 16
  },
  dropdownOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  dropdownOptionSelected: {
    backgroundColor: "#f0f4ff"
  },
  dropdownOptionPressed: {
    backgroundColor: "#f8fafc"
  },
  dropdownOptionText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600"
  },
  dropdownOptionTextSelected: {
    color: "#141c3a",
    fontWeight: "800"
  },
  dropdownCheckmark: {
    color: "#141c3a",
    fontSize: 15,
    fontWeight: "800"
  },
  createdScreen: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  createdPanel: {
    width: "100%"
  },
  createdTitle: {
    color: "#141c3a",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center"
  },
  createdMessage: {
    color: "#4b5563",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center"
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginVertical: 18
  },
  divider: {
    backgroundColor: "#e5d2d2",
    flex: 1,
    height: 1
  },
  or: {
    color: "#6b7280",
    fontSize: 14,
    marginHorizontal: 18
  },
  spacer: {
    height: 12
  },
  footer: {
    color: "#6b7280",
    fontSize: 16,
    marginTop: 22,
    textAlign: "center"
  },
  footerLink: {
    color: "#141c3a",
    fontWeight: "800"
  }
});
