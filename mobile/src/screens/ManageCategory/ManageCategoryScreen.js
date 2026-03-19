import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { createCategoryApi, deleteCategoryApi, listCategoriesApi, updateCategoryApi } from "../../services/api";
import ConfirmDialog from "../../components/ConfirmDialog";
import styles from "./styles";

function CategoryRow({ item, onEdit, onDelete }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowName}>{item.name}</Text>
      <View style={styles.rowActions}>
        <Pressable style={styles.editButton} onPress={() => onEdit(item)}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={() => onDelete(item)}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ManageCategoryScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);

  const load = useCallback(async () => {
    setError("");
    const data = await listCategoriesApi(token);
    setItems(data.items || []);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      async function run() {
        setLoading(true);
        try {
          await load();
        } catch (err) {
          if (mounted) setError(err.message || "Failed to load categories");
        } finally {
          if (mounted) setLoading(false);
        }
      }
      run();
      return () => {
        mounted = false;
      };
    }, [load])
  );

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setSubmitting(true);
    setError("");
    try {
      await createCategoryApi(token, { name });
      setNewName("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit() {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;
    setSubmitting(true);
    setError("");
    try {
      await updateCategoryApi(token, editingId, { name });
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message || "Failed to update category");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(item) {
    setPendingDeleteCategory(item);
  }

  async function handleDelete(id) {
    setSubmitting(true);
    setError("");
    try {
      await deleteCategoryApi(token, id);
      if (editingId === id) {
        cancelEdit();
      }
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete category");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDeleteCategory() {
    const current = pendingDeleteCategory;
    setPendingDeleteCategory(null);
    if (!current) return;
    await handleDelete(current.id);
  }

  if (loading) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator size="large" color="#0f62fe" />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Manage Category</Text>
      <Text style={styles.subtitle}>Create, edit, or delete IoT categories.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add New Category</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Category name (e.g. Home 1)"
            placeholderTextColor="#8aa0b8"
          />
          <Pressable style={styles.addButton} onPress={handleAdd} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>Add</Text>}
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category List</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {editingId ? (
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Edit Category</Text>
            <TextInput
              style={styles.input}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Category name"
              placeholderTextColor="#8aa0b8"
            />
            <View style={styles.editActions}>
              <Pressable style={styles.saveButton} onPress={saveEdit} disabled={submitting}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={cancelEdit}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CategoryRow item={item} onEdit={startEdit} onDelete={confirmDelete} />}
          ListEmptyComponent={<Text style={styles.empty}>No categories yet.</Text>}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <ConfirmDialog
        visible={Boolean(pendingDeleteCategory)}
        title="Delete Category"
        message={`Delete category "${pendingDeleteCategory?.name || ""}"? Devices in this category will become Uncategorized.`}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setPendingDeleteCategory(null)}
        onConfirm={handleConfirmDeleteCategory}
      />
    </View>
  );
}
